## Middleware
```
body-parser
```
Parses body of requests and add's a `body` key to the request

```
client-sessions
```
Session management tool (maintained by Mozilla), adds `req.session` which allows you to add any key:value pairs to it and those get cryptographically stored in a cookie

## Database
```
postgresql
``` 
Which requires `pg` and `pg-hstore` packages to work with `sequelizer`

```
sequelizer
```
ORM

## Miscellaneous Libraries
```
bcryptjs
```
Used to incorporate bcrypt hashing into password storage.
$WORK_FACTOR=14 **(do NOT hardcode)**

```
dotenv
```
Loads environment variables from `.env` files