import { EventEmitter } from 'events'

export default class S3EventEmitter extends EventEmitter {
  public progressAmount: number = 0
  public progressTotal: number = 0
  public objectsFound: undefined | number
  public dirsFound: undefined | number
  constructor () {
    super()
  }
}
