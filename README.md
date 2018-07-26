# rxhttp
Simple Streaming Fetch/RxJs HTTP Client

Interact with an HTTP stream via an RxJs Observable. Supports typed responses with generics.

install: `npm install @mkeen/rxhttp`

ex: 

```
new HttpRequest<any>(
  'https://localhost/something', {
    method: 'POST',
    body: JSON.stringify({
      'doc_ids': []
    })
  }
).watch().subscribe(
  (incoming_data: any) => console.log(incoming_data)
);
```

Even supports basic request/response

```
new HttpRequest<any>(
  'https://localhost/boring', {
    method: 'GET'
  }
).send().subscribe(
  (incoming_data: any) => console.log("received response, connection closed")  
)
```
