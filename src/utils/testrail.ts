import {SyncRequestClient} from 'ts-sync-request/dist'
import {AddCase, PaginatedProjects, Project, PaginatedSections, ResultField, Section, Suite, PaginatedTests, Test, TestRailResult, AddRun, Run, CaseFields, PaginatedMilestones, Milestone} from './testrail.interface'

export class TestRailClient {
    public base: string

    public username: string

    public password: string

    public url: string

    private caseFields: CaseFields[] = []

    constructor(base: string, username: string, password: string) {
      this.base = base
      this.username = username
      this.password = password
      if (this.base.substr(-1) !== '/') {
        this.base += '/'
      }
      this.url = this.base + 'index.php?/api/v2/'
    }

    public getProjects(): Project[] {
      const projectsObject = this.sendRequest('GET', 'get_projects', '') as PaginatedProjects
      if (projectsObject.size > 0) {
        return projectsObject.projects as Project[]
      }
      throw new Error("Something went wrong. Can't find any project")
    }

    public getSuites(projectId: number): Suite[] {
      return this.sendRequest('GET', 'get_suites/' + projectId.toString(), '') as Suite[]
    }

    public getMilestones(projectId: number): Milestone[] {
      const milestonesObject = this.sendRequest('GET', 'get_milestones/' + projectId.toString(), '') as PaginatedMilestones
      if (milestonesObject.size > 0) {
        return milestonesObject.milestones as Milestone[]
      }
      return []
      // throw new Error("Something went wrong. Can't find any milestone")
    }

    public getResultFields(): ResultField[] {
      return this.sendRequest('GET', 'get_result_fields', '') as ResultField[]
    }

    public addMilestone(projectId: number, name: string): Milestone {
      return this.sendRequest('POST', 'add_milestone/' + projectId.toString(), {name: name}) as Milestone
    }

    public getSections(projectId: number, suiteId: number): Section[] {
      const sectionsObject = this.sendRequest('GET', 'get_sections/' + projectId.toString() + '&suite_id=' + suiteId.toString(), '') as PaginatedSections
      if (sectionsObject.size > 0) {
        return sectionsObject.sections as Section[]
      }
      return []
      // throw new Error("Something went wrong. Can't find any section")
    }

    public addSection(projectId: number, suiteId: number, section: string, parentId: string): Section {
      return this.sendRequest('POST', 'add_section/' + projectId.toString(), {suite_id: suiteId.toString(), name: section, parent_id: parentId}) as Section
    }

    public getCases(projectId: number, suiteId: number, sectionId: number): Test[] {
      const casesObject = this.sendRequest('GET', 'get_cases/' + projectId.toString() + '&suite_id=' + suiteId.toString() + '&section_id=' + sectionId.toString(), '') as PaginatedTests
      if (casesObject.size > 0) {
        return casesObject.cases as Test[]
      }
      return []
      // throw new Error("Something went wrong. Can't find any test case")
    }

    public addCase(sectionId: number, addCase: AddCase): Test {
      return this.sendRequest('POST', 'add_case/' + sectionId.toString(), addCase) as Test
    }

    public addRun(projectId: number, addRun: AddRun): Run {
      return this.sendRequest('POST', 'add_run/' + projectId.toString(), addRun) as Run
    }

    public addResults(runId: number, results: TestRailResult[]): TestRailResult[] {
      return this.sendRequest('POST', 'add_results_for_cases/' + runId.toString(), {results: results}) as TestRailResult[]
    }

    public closeRun(runId: number): Run {
      return this.sendRequest('POST', 'close_run/' + runId.toString(), '/runs/close/' + runId.toString()) as Run
    }

    public getCaseFields(): CaseFields[] {
      return this.sendRequest('GET', 'get_case_fields', '') as CaseFields[]
    }

    public getCustomVersion(version: string): number[] {
      if (this.caseFields.length === 0) {
        this.caseFields = this.getCaseFields()
      }
      const versionField = this.caseFields.find(field => field.system_name === 'custom_version')
      if (versionField === undefined) {
        throw new Error("Something went wrong. Can't find custom field 'custom_version'")
      }
      // the returned items look like this:
      // 1, 7.2.0.0\n 2, 7.1.2.2\n....
      const listOfCustomVersion = versionField.configs[0].options.items.split('\n')
      const foundVersion = listOfCustomVersion.find(v => v.includes(version))
      if (foundVersion === undefined) {
        throw new Error(`Something went wrong. Can't find custom status ${status}`)
      }
      return [Number(foundVersion.split(',')[0])]
    }

    public getCustomStatus(status: string): number {
      if (this.caseFields.length === 0) {
        this.caseFields = this.getCaseFields()
      }
      const statusField = this.caseFields.find(field => field.system_name === 'custom_status')
      if (statusField === undefined) {
        throw new Error("Something went wrong. Can't find custom field 'custom_status'")
      }
      // the returned items look like this:
      // "1, Incomplete/draft\n2, Complete\n3, In progress\n4, Needs to be checked/reworked
      const listOfCustomStatus = statusField.configs[0].options.items.split('\n')
      const foundStatus = listOfCustomStatus.find(s => s.includes(status))
      if (foundStatus === undefined) {
        throw new Error(`Something went wrong. Can't find custom status ${status}`)
      }
      return Number(foundStatus.split(',')[0])
    }

    private sendRequest(method: string, uri: string, data: {}) {
      const encode = (str: string): string => Buffer.from(str, 'binary').toString('base64')
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
        } catch (error: any) {
          if (error.statusCode === 429) {
            // eslint-disable-next-line no-console
            console.log(`Failed to send ${method} request to ${uri}. Maximum number of allowed API calls per minute reached. Waiting 90 seconds...`)
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 90000)
          } else {
            // eslint-disable-next-line no-console
            console.log(`Failed to send ${method} request to ${uri} with data ${JSON.stringify(data, null, 4)}:\n${(error as Error).message}`)
            const randomWait: number = Math.floor(Math.random() * 200)
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, randomWait)
          }
        }
      }
    }
}
