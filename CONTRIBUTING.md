# Contributing

Use Node.js 22 or newer. Fork the repository, create a focused branch, run
`npm test` and `npm run lint`, and explain data/recovery implications in the pull
request. Never include OAuth credentials, tokens, personal file paths, databases
or logs. Provider changes must preserve the interface and use mocked tests. Schema
changes require a forward-only migration, a backup strategy and documentation
updates. Security issues should be reported privately to the maintainer rather
than opened with sensitive details in a public issue.

