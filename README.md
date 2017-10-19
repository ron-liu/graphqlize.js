# graphqlize.js
> This project is still under heavy development, we will give update this document in more details shortly. 

Graphql is cool, but there is still a big gap between the schema and real database. 
Yes, [graphcool](http://www.graph.cool) is even cool, it will generate the whole backend for you.

However, how about if you want to control your own data? 
Then graphqlize.js is the answer. 
* It generates whole graphql backend with the schema you provides;
* It enables you to write your services exposed as queries and mutations easily;
* It supports many relational databases, like: postgres, sql server, and and sqlite3, etc.;
* It supports customised authorization policies;

## Get started
### Install 
```bash
yarn add graphqlize-server
```
### Create schema
Create a schema file named as `xxx.type.gql`, like below:
```graphql
# post.type.gql
type Post {
	id: ID
	title: String
}
```

### Start the server
```javascript
import {startServer} from 'graphqlize-server'
startServer({
	schemaFilePattern: `${__dirname}/**/*.type.gql`,
	connection: {option: {dialect: 'sqlite', sync: {force: true}}}
})
```

### Done
If you visit `http://localhost:3000/graphiql`，you should get all the queries and mutations for this `Post` model.


