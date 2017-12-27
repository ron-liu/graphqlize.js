import {map, prop, head} from '../../util'
import {v4} from 'uuid'
const ronId = v4()
const angelaId = v4()
const javascriptId = v4()
const asyncId = v4()
const weappId = v4()
export default {
  types: [`
    type Account {
      id: ID!
      unionid: String!
      openid: String!
      wechatUserInfo: Json!,
      roles: [Role!]!
    }
    
    enum Role {
      Admin,
      Instructor,
      Student
    }

    type Course {
      id: ID!
      instructedBy: Account! @relation(name:courseInstructedByOnAccount)
      name: String!
      description: String!
      technology: Technology! @relation(name:courseTechnology)
      tags: [String!]
      duration: Int!
      coverImageUrl: String!
      numberOfLessons: Int!
      lessons: [Lesson!] @relation(name:courseLessons)
      status: CourseStatus!
      numberLiked: Int
      numberCommented: Int
      numberOfPeoplePlayed: Int
    }
    
    enum CourseStatus {
      New
      Published
    }

    type Lesson {
      id: ID!
      order: Int!
      name: String!
      duration: Int!
      videoUrl: String!
      scripts: String
      sourceUrl: String
      course: Course! @relation(name:courseLessons)
    }
    
    type Technology {
      id: ID!
      name: String!
      description: String
    }

		type CourseProgress {
      id: ID!,
      ownedBy: Account! @relation (name: courseProgressOwnedByOnAccount)
      course: Course! @relation (name: courseProgressOnCourse)
      percentage: Int!
      currentOrder: Int!
    }

	`],
  cases: [
    {
      only: true,
      name: 'query',
      init: {
        Account: [
          {id: ronId, unionid: '1', openid:'2', wechatUserInfo: {name: 'ron'}, roles: ['Instructor']},
          {id: angelaId, unionid: '2', openid:'3', wechatUserInfo: {name: 'angela'}, roles: ['Instructor']},
        ],
        Technology: [
          { id: javascriptId, name: 'javascript', description: '包含es6等'}
        ],
        Course: [
          {
            id: asyncId, instructedById: () => ronId, name: '使用async/await实现异步', description: '', technologyId: () => javascriptId,
            tags: ['异步', 'javascript'], duration: 200,
            coverImageUrl: 'http://7xrm9v.com1.z0.glb.clouddn.com/javascript.png',
            numberOfLessons: 5,
            lessons: [],
            status: 'Published',
            numberOfPeoplePlayed: 201
          },
          {
            instructedById: () => ronId, name: '使用Graphql实现api服务端', description: '', technologyId: () => javascriptId,
            tags: ['异步', 'javascript'], duration: 200,
            coverImageUrl: 'http://7xrm9v.com1.z0.glb.clouddn.com/graphql.png',
            numberOfLessons: 3,
            lessons: [],
            status: 'Published',
            numberOfPeoplePlayed: 201
          },
          {
            id: weappId, instructedById: () => ronId, name: '开发小程序', description: '', technologyId: () => javascriptId,
            tags: ['异步', 'javascript'], duration: 200,
            coverImageUrl: 'http://7xrm9v.com1.z0.glb.clouddn.com/weapp.png',
            numberOfLessons: 3,
            lessons: [],
            status: 'Published',
            numberOfPeoplePlayed: 201
          },
        ],
        CourseProgress: [
          {
            ownedById: () => angelaId,
            courseId: () => asyncId,
            percentage: 45,
            currentOrder: 2,
          },
          {
            ownedById: () => angelaId,
            courseId:() => weappId,
            percentage: 100,
            currentOrder: 3,
          }
        ]
      },
      gqlActs: [
        [
          ['{allCourseProgresses { id, ownedBy {id}}}'],
          prop('allCourseProgresses'),
          {toHaveLength: 2}
          ],
      ]
    }
  ]
}