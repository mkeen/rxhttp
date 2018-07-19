# rxhttp
Simple Streaming Fetch/RxJs HTTP Client

Interact with an HTTP stream via an RxJs Observable. Supports typed responses via generics.

install: `npm install @mkeen/rxhttp`

ex: 

```
new HttpRequest<any>(
  this.urlFromConfig(config), {
    method: 'POST',
    body: JSON.stringify({
      'doc_ids': config[0]
    })
  }
).send().subscribe(
  (incoming_data: any) => console.log(incoming_data)
);
