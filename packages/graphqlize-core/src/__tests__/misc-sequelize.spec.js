import Sequelize from 'sequelize'
import {v4} from 'uuid'

describe ("nested n-1 should be queryable for parent", () => {
	const sequelize = new Sequelize('', '', '', {dialect: 'sqlite',})
	const PostModel = sequelize.define('Post', {
		title: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	const CommentModel = sequelize.define('Comment', {
		content: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	const LikeModel = sequelize.define('Like', {
		createdBy: Sequelize.STRING
	})
	LikeModel.belongsTo(CommentModel, {as: 'comment', foreignKey: 'commentId'})
	CommentModel.belongsTo(PostModel, {as: 'post', foreignKey: 'postId'})
	
	beforeEach(async (done) => {
		await sequelize.sync({force: true})
		done()
	})
	
	test('should OK', async () => {
		await LikeModel.create(
			{
				createdBy: 'ron',
				comment:{
					content: 'good', createdBy: 'john',
					post: {title: 'hi', createdBy: 'mike'}
				}
				
			},
			{
				include: [
					{model: CommentModel, as: 'comment', include: [{model: PostModel, as: 'post'}]}
				]
			}
		)
		await LikeModel.findAll({
			where: {
				'$comment.post.title$': 'hi'
			},
			include: [
				{model: CommentModel, as: 'comment', include: [{model: PostModel, as: 'post', include: []}]}
			]
		})
		
	})
})

describe ("n-1 with 1-n should be queryable for parent", () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const PostModel = sequelize.define('Post', {
		title: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	const CommentModel = sequelize.define('Comment', {
		content: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	PostModel.hasMany(CommentModel, {as: 'comments', foreignKey: 'postId'})
	CommentModel.belongsTo(PostModel, {as: 'post', foreignKey: 'postId'})
	
	beforeEach(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	
	test('query parent', async() => {
		await PostModel.create(
			{title: 'hi', createdBy: 'ron', comments: [{content: 'good', createdBy: 'john'}]},
			{include: [{model: CommentModel, as: 'comments'}]}
		)
		await PostModel.create(
			{title: 'oh', createdBy: 'john', comments: [{content: 'good', createdBy: 'ron'}]},
			{include: [{model: CommentModel, as: 'comments'}]}
		)

		const result = await CommentModel.findAll(
			{
				where: {
					$or: [
						{createdBy: 'ron'},
						{'$post.createdBy$': 'ron'}
					]
				},
				include: [{model: PostModel, as:'post'}]
			}
		)
		expect(result).toHaveLength(2)
	})
})

describe('only 1-n should be queryable', () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const PostModel = sequelize.define('Post', {
		title: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	const CommentModel = sequelize.define('Comment', {
		content: Sequelize.STRING,
		createdBy: Sequelize.STRING
	})
	PostModel.hasMany(CommentModel, {as: 'comments', foreignKey: 'id_for_Post_comments'})
	
	beforeEach(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	
	test('from n side should be queryable', async () => {
		const post = await PostModel.create(
			{title: 'hi', createdBy: 'ron', comments: [{content: 'good', createdBy: 'john'}]},
			{include: [{model: CommentModel, as: 'comments'}]}
		)
		
		const comments = await CommentModel.findAll({where: {id_for_Post_comments: post.id}})
		expect(comments).toHaveLength(1)
	})
	
	test('trying to use generate query statement', async () => {
		const Model = require('sequelize/lib/model')
		let options = {
			include: [
				{model: CommentModel, as: "comments"}
			],
			model: PostModel
		};
		Model._validateIncludedElements.bind(PostModel)(options) // for es5 you can use call
		const sql = sequelize.dialect.QueryGenerator.selectQuery(PostModel.tableName, options, PostModel);
	})
	
	test('trying subquery', async () => {
		await PostModel.create(
			{title: 'hi', createdBy: 'ron', comments: [{content: 'good', createdBy: 'john'}]},
			{include: [{model: CommentModel, as: 'comments'}]}
		)
		await PostModel.create(
			{title: 'oh', createdBy: 'john', comments: [{content: 'good', createdBy: 'ron'}]},
			{include: [{model: CommentModel, as: 'comments'}]}
		)
		
		let options = {
			attributes: ['id_for_Post_comments'],
			where: {
				createdBy: 'ron'
			}
		};
		const subSql = sequelize.dialect.QueryGenerator
			.selectQuery(CommentModel.tableName, options, CommentModel)
			.slice(0,-1)
		
		const posts = (await PostModel.findAll({
			where: {
				id: {$in: sequelize.literal(`(${subSql})`)}
			}
		}))
		
		expect(posts).toHaveLength(1)
		expect(posts[0].get().title).toEqual('oh')
	})
	
})

describe ('1-1 should', () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const AccountModel = sequelize.define('Account', {
		password: Sequelize.STRING
	})
	const UserModel = sequelize.define('User', {
		name: Sequelize.STRING,
	})
	AccountModel.belongsTo(UserModel, {as: 'user', foreignKey: 'userId'})
	UserModel.hasOne(AccountModel, {as: 'account', foreignKey: 'userId'})
	
	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	
	test('query', async () => {
		await AccountModel.create(
			{password: '123', user: {name: 'ron'}},
			{include: [{model: UserModel, as: 'user'}]}
		)
		await UserModel.create(
			{name: 'john', account: {password: '456'}},
			{include: [{model: AccountModel, as: 'account'}]}
		)
		
		const result1 = await AccountModel.findAll(
			{
				where: {
					$or: [
						{ password: '123' },
						{ '$user.name$': 'john'}
					]
				},
				include: {model: UserModel, as: 'user'}
			}
		)
		expect(result1).toHaveLength(2)
		
		const result2 = await UserModel.findAll(
			{
				attributes: ['name'],
				where: {
					$or: [
						{name: 'ron'},
						{'$account.password$': '456'}
					],
				},
				include: [{model: AccountModel, as: 'account'}]
			}
		)
		expect(result2).toHaveLength(2)
	})
	
})

describe('n-n', async () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const UserModel = sequelize.define('user', { name: Sequelize.STRING })
	const TeamModel = sequelize.define('team', { logo: Sequelize.STRING})
	
	UserModel.belongsToMany(TeamModel,  {through: 'userTeam', as: 'teams'})
	TeamModel.belongsToMany(UserModel, {through: 'userTeam', as: 'users'})
	
	beforeEach(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	
	// test('should work', ()=>{})
	
	test('subquery should work', async ()=>{
		await UserModel.create(
			{name: 'ron', teams: [{logo: 'x'}, {logo: 'y'}]},
			{include: {model: TeamModel, as: 'teams'}}
		)
		await UserModel.create(
			{name: 'angela', teams: [{logo: 'a'}, {logo: 'b'}]},
			{include: {model: TeamModel, as: 'teams'}}
		)
		
		const subSql = sequelize.dialect.QueryGenerator
		.selectQuery(TeamModel.tableName, {
			attributes: ['id'],
			where: {
				$or: [{logo: 'x'}, {logo: 'a'}]
			}
		}, TeamModel)
		.slice(0,-1)
		
		const users = (await UserModel.findAll({
			attributes: [],
			where: {
				'$teams.userTeam.teamId$': {$in: sequelize.literal(`(${subSql})`)}
			},
			include: [
				{
					model: TeamModel,
					as: 'teams',
				}
			]
		})).map(x=>x.get())
		
		expect(users).toHaveLength(2)

	})
})

describe ('1-n only',  () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const StudentModel = sequelize.define('student', {name: Sequelize.STRING})
	const ClassModel = sequelize.define('class', {logo: Sequelize.STRING})
	
	ClassModel.hasMany(StudentModel, {as: 'students'})

	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should work', ()=>{})
})

describe('upsert', () => {
	const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})
	const StudentModel = sequelize.define('student', {
		name: Sequelize.STRING,
		id: {
			type: Sequelize.UUID,
			primaryKey: true,
			defaultValue: Sequelize.UUIDV4
		}
	})
	beforeEach(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should work for update', async ()=>{
		const {id} = await StudentModel.create({name: 'ron'})
		await StudentModel.upsert({id, name: 'abc'})
		
		const students = await StudentModel.findAll()
		expect(students).toHaveLength(1)
		expect(students[0].get()).toEqual(expect.objectContaining({id, name: 'abc'}))
	})

	test('should work for update', async ()=>{
		const {id} = await StudentModel.create({name: 'ron'})
		const newId = v4()
		await StudentModel.upsert({name: 'abc', id: newId})
		
		const student = await StudentModel.findOne({where: { id: newId}})
		expect(student.get()).toEqual(expect.objectContaining({id: newId, name: 'abc'}))
	})
})
