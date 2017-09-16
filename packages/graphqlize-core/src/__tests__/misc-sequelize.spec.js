import Sequelize from 'sequelize'

const sequelize = new Sequelize('', '', '', { dialect: 'sqlite',})

describe ("n-1 1-n should be queryable", () => {
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
		console.log(sql)
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
			attributes: ['postId'],
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

describe.only('n-n', async () => {
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
	const StudentModel = sequelize.define('student', {name: Sequelize.STRING})
	const ClassModel = sequelize.define('class', {logo: Sequelize.STRING})
	
	ClassModel.hasMany(StudentModel, {as: 'students'})

	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should work', ()=>{})
})
