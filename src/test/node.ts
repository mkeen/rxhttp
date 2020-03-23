import { HttpRequest } from '../httprequest';
import { FetchBehavior } from '../types';

const httpRequest = new HttpRequest('http://10.0.0.115:5984/test1234/_changes?include_docs=true&feed=continuous', {
  method: 'POST'
}, FetchBehavior.stream).fetch().subscribe((res) => {
  console.log(res, "!!!");
}, (err) => {
  console.log("error")
}, () => {
  console.log("complete");
})