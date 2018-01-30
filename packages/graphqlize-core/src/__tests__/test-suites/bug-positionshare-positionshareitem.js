import {tap, head, prop} from '../../util'
import {v4} from 'uuid'
const countryId = v4()

export default {
  types: [`
    type Country {
      id: ID!
      name:String
    }
		type PositionShare {
      id: ID!
      remark:String
      country: Country @relation(name:"PositionShareCountry")
    }
	`],
  cases: [
    {
      name: 'bug positionshare',
      only: true,
      init: {
        PositionShare: [
          {remark: 'remark', country: {name: 'china', id: countryId}}
        ]
      },
      gqlActs: [
        [
          [
            `query AllPositionSharesDemand ($filter:PositionShareFilter){
                allPositionShares (filter:$filter)
              {remark}
            }`, null, null,
            {"filter": {countryId}}
          ],
          prop('allPositionShares'),
          {toHaveLength: 1}
        ]
      ]
    }
  ]
}