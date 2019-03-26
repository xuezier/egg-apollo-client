var http = require('http');

http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.write(JSON.stringify({status: 200}));
    response.end();
}).listen(3333);
