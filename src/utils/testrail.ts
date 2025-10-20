import {SyncRequestClient} from 'ts-sync-request/dist/index.js'

import {
  AddCase,
  AddRun,
  CaseFields,
  Milestone,
  PaginatedMilestones,
  PaginatedProjects,
  PaginatedSections,
  PaginatedSuites,
  PaginatedTests,
  Project,
  ResultField,
  Run,
  Section,
  Suite,
  Test,
  TestRailResult,
} from './testrail.interface.js'

export class TestRailClient {
  public base: string

  public password: string

  public url: string

  public username: string

  private caseFields: CaseFields[] = []

  constructor(base: string, username: string, password: string) {
    this.base = base
    this.username = username
    this.password = password
    if (this.base.slice(-1) !== '/') {
      this.base += '/'
    }

    this.url = this.base + 'index.php?/api/v2/'
  }

  public addCase(sectionId: number, addCase: AddCase): Test {
    return this.sendRequest(
      'POST',
      'add_case/' + sectionId.toString(),
      addCase,
    ) as Test
  }

  public addMilestone(projectId: number, name: string): Milestone {
    return this.sendRequest('POST', 'add_milestone/' + projectId.toString(), {
      name,
    }) as Milestone
  }

  public addResults(
    runId: number,
    results: TestRailResult[],
  ): TestRailResult[] {
    return this.sendRequest(
      'POST',
      'add_results_for_cases/' + runId.toString(),
      {results},
    ) as TestRailResult[]
  }

  public addRun(projectId: number, addRun: AddRun): Run {
    return this.sendRequest(
      'POST',
      'add_run/' + projectId.toString(),
      addRun,
    ) as Run
  }

  public addSection(
    projectId: number,
    suiteId: number,
    section: string,
    parentId = '',
  ): Section {
    let sectionParams: any = {
      name: section,
      suite_id: suiteId.toString(),
    }
    if (parentId !== '') {
      sectionParams = {
        ...sectionParams,
        parent_id: parentId,
      }
    }

    return this.sendRequest(
      'POST',
      'add_section/' + projectId.toString(),
      sectionParams,
    ) as Section
  }

  public closeRun(runId: number): Run {
    return this.sendRequest(
      'POST',
      'close_run/' + runId.toString(),
      '/runs/close/' + runId.toString(),
    ) as Run
  }

  public getCaseFields(): CaseFields[] {
    return this.sendRequest('GET', 'get_case_fields', '') as CaseFields[]
  }

  public getCases(
    projectId: number,
    suiteId: number,
    sectionId: number,
  ): Test[] {
    const casesObject = this.sendRequest(
      'GET',
      'get_cases/'
        + projectId.toString()
        + '&suite_id='
        + suiteId.toString()
        + '&section_id='
        + sectionId.toString(),
      '',
    ) as PaginatedTests
    if (casesObject.size > 0) {
      return casesObject.cases as Test[]
    }

    return []
    // throw new Error("Something went wrong. Can't find any test case")
  }

  public getCustomStatus(status: string): number {
    if (this.caseFields.length === 0) {
      this.caseFields = this.getCaseFields()
    }

    const statusField = this.caseFields.find(
      field => field.system_name === 'custom_status',
    )
    if (statusField === undefined) {
      throw new Error(
        "Something went wrong. Can't find custom field 'custom_status'",
      )
    }

    // the returned items look like this:
    // "1, Incomplete/draft\n2, Complete\n3, In progress\n4, Needs to be checked/reworked
    const listOfCustomStatus = statusField.configs[0].options.items.split('\n')
    const foundStatus = listOfCustomStatus.find(s => s.includes(status))
    if (foundStatus === undefined) {
      throw new Error(
        `Something went wrong. Can't find custom status ${status}`,
      )
    }

    return Number(foundStatus.split(',')[0])
  }

  public getCustomVersion(version: string): number[] {
    if (this.caseFields.length === 0) {
      this.caseFields = this.getCaseFields()
    }

    const versionField = this.caseFields.find(
      field => field.system_name === 'custom_version',
    )
    if (versionField === undefined) {
      throw new Error(
        "Something went wrong. Can't find custom field 'custom_version'",
      )
    }

    // the returned items look like this:
    // 1, 7.2.0.0\n 2, 7.1.2.2\n....
    const listOfCustomVersion
      = versionField.configs[0].options.items.split('\n')
    const foundVersion = listOfCustomVersion.find(v => v.includes(version))
    if (foundVersion === undefined) {
      throw new Error(
        `Something went wrong. Can't find custom version ${version}`,
      )
    }

    return [Number(foundVersion.split(',')[0])]
  }

  public getMilestones(projectId: number): Milestone[] {
    const milestonesObject = this.sendRequest(
      'GET',
      'get_milestones/' + projectId.toString(),
      '',
    ) as PaginatedMilestones
    if (milestonesObject.size > 0) {
      return milestonesObject.milestones as Milestone[]
    }

    return []
    // throw new Error("Something went wrong. Can't find any milestone")
  }

  public getProjects(): Project[] {
    const projectsObject = this.sendRequest(
      'GET',
      'get_projects',
      '',
    ) as PaginatedProjects
    if (projectsObject.size > 0) {
      return projectsObject.projects as Project[]
    }

    throw new Error("Something went wrong. Can't find any project")
  }

  public getResultFields(): ResultField[] {
    return this.sendRequest('GET', 'get_result_fields', '') as ResultField[]
  }

  public getSections(projectId: number, suiteId: number): Section[] {
    const sections: Section[] = []
    const sectionsObject = this.sendRequest(
      'GET',
      `get_sections/${projectId.toString()}&suite_id=${suiteId.toString()}`,
      '',
    ) as PaginatedSections
    if (sectionsObject.size > 0) {
      for (const s of sectionsObject.sections) {
        sections.push(s)
      }

      let lastCallSectionsCount = sectionsObject.sections.length
      const hardLimit = 50 // Hard limit the number of queries to avoid going in an infinite loop
      let cpt = 0
      while (lastCallSectionsCount > 0 && cpt <= hardLimit) {
        const sectionsObject = this.sendRequest(
          'GET',
          `get_sections/${projectId.toString()}&suite_id=${suiteId.toString()}&limit=250&offset=${
            sections.length
          }`,
          '',
        ) as PaginatedSections
        lastCallSectionsCount = sectionsObject.sections.length

        console.log(
          `Fetched ${lastCallSectionsCount} sections (${sections.length} already fetched)`,
        )
        for (const s of sectionsObject.sections) {
          sections.push(s)
        }

        cpt++
      }

      return sections
    }

    return []
    // throw new Error("Something went wrong. Can't find any section")
  }

  public getSuites(projectId: number): Suite[] {
    const getSuites = this.sendRequest(
      'GET',
      'get_suites/' + projectId.toString(),
      '',
    ) as PaginatedSuites
    return getSuites.suites as Suite[]
  }

  private sendRequest(method: string, uri: string, data: {}): unknown {
    const encode = (str: string): string =>
      Buffer.from(str, 'binary').toString('base64')
    const url: string = this.url + uri

    const auth: string = encode(this.username + ':' + this.password)
    for (let i = 0; i < 5; i++) {
      try {
        if (method === 'GET') {
          return new SyncRequestClient()
          .addHeader('Authorization', 'Basic ' + auth)
          .addHeader('Content-Type', 'application/json')
          .get(url)
        }

        if (method === 'POST') {
          return new SyncRequestClient()
          .addHeader('Authorization', 'Basic ' + auth)
          .addHeader('Content-Type', 'application/json')
          .post(url, data)
        }
      } catch (error) {
        const err = error as { message?: string; statusCode?: number }
        if (err.statusCode === 429) {
          console.log(
            `Failed to send ${method} request to ${uri}. Maximum number of allowed API calls per minute reached. Waiting 90 seconds...`,
          )
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 90_000)
        } else {
          console.log(
            `Failed to send ${method} request to ${uri} with data ${JSON.stringify(
              data,
              null,
              4,
            )}:\n${err.message || String(error)}`,
          )
          const randomWait: number = Math.floor(Math.random() * 200)
          Atomics.wait(
            new Int32Array(new SharedArrayBuffer(4)),
            0,
            0,
            randomWait,
          )
        }
      }
    }

    return null
  }
}
