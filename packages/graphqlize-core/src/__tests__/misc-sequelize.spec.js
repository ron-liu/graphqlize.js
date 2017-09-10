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
	
	beforeAll(async(done) => {
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

describe('n-n', async () => {
	const UserModel = sequelize.define('user', {
		name: Sequelize.STRING
	})
	
	const TeamModel = sequelize.define('team', {
		logo: Sequelize.STRING
	})
	
	UserModel.belongsToMany(TeamModel,  {through: 'UserTeam', as: 'teams'})
	TeamModel.belongsToMany(UserModel, {through: 'UserTeam', as: 'users'})
	
	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should work', ()=>{})
})

describe.only ('1-n only',  () => {
	const StudentModel = sequelize.define('student', {name: Sequelize.STRING})
	const ClassModel = sequelize.define('class', {logo: Sequelize.STRING})
	
	ClassModel.hasMany(StudentModel, {as: 'students'})

	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should work', ()=>{})
})
