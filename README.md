# protoc-gen-hbs

🏃‍♀️ Fast and easy protobuf generation with handlebars and some helpers

## Why ?

This project aims to be the simplest way to generate api, model and whatever based on protobuf for any languages.
Protobuf based generation can really improve productivity of developers, and a lot of tools already exists in that way.
But, it is really painful to generate custom things or create plugin with imperative languages.
This is where template languages are useful.
But there is another problem.
After releasing and using [pbhbs](https://github.com/gponsinet/pbhbs), I realised that every templates I did was not maintainable and this was a mess to re-create new ones.
This is why this project exists.

## Philosophy

* Newbie-friendly
* Less configs as possible
* Maintainable
* Happy protobuf developpers :smile:

## Installation

First, install [protoc](http://google.github.io/proto-lens/installing-protoc.html) and [yarn](https://yarnpkg.com/en/docs/install) or [npm](https://www.npmjs.com/get-npm)

Then type:

```bash
yarn global add protoc-gen-hbs
```

or

```bash
npm install --global protoc-gen-hbs
```

## Usage

### CLI

```
protoc --hbs_out="[<template_dir>:]<out_dir>" [-I<proto_paths>...] <proto_files>...
```

### Handlebars Template

#### Paths

Template paths should follow this form

* `whatever.hbs` will aggregate every proto file
* `{{file}}.ext.hbs` to generate one file by proto file
* `{{package}}.ext.hbs` to generate one file by package
* `{{service}}.ext.hbs` to generate one file by service
* `{{file}}/{{message}}.ext.hbs` will iterate over messages of files
* `{{file}}/{{service}}.ext.hbs` will iterate over file and services
* ...

#### Context

* Each template will get its proper context with accessible root context if desired
* Handlebars root context will be the scope of the file path
.e.g: `{{file}}/{{service}}.ext.hbs` will send service as root context

#### Directory

* User is free to define directory path with template paths

### Protobuf Helpers

* Protobuf helpers can take parameters arguments to filter their context
* For helpers not related with protobuf
  * all [handlebars-helpers](helpers/handlebars-helpers) have been included
  * better string case helpers have been added too (see [here](src/case.js))

#### [{{import}}](examples/templates/import.ts.hbs)

```handlebars
{{#import}}
include "{{@name}}.pb.h"
{{/import}}
```

#### [{{package}}](examples/templates/package.ts.hbs)

```handlebars
{{#package}}
namespace {{@name}} {
  // will add nested message, enum and fields
}
{{/package}}

{{#package "google.*"}}
  // {{@name}}
{{else}}
  // ...
{{/package}}
```

#### [{{message}}](examples/templates/message.ts.hbs)

```handlebars
{{#message "google.protobuf.Timestamp"}}
class {{@name}} extends DateTime {}
{{else}}
class {{@name}} {}
{{/message}}

// By default children will get parents name as prefix:

{{#message}}
  {{@name}}
{{/message}}

// equals

{{#service}}
  {{#message}}
  {{@service.name}}.{{@name}}
  {{/message}}
{{/service}}
```

#### [{{field}}](examples/templates/field.ts.hbs)

```handlebars
{{#field}}
const {{@name}}: {{@type}} = null
{{/field}}

// You can filter fields by label or type

{{#field label="repeated"}}
// TODO: convert type
const {{@name}}: Array<{{@type}}> = []
{{/field}}

{{#field type="string"}}
const {{@name}}: string = ''
{{/field}}

{{#field label="optional" type="number"}}
const {{@name}}: number? = undefined
{{/field}}
```

#### [{{enum}}](examples/templates/enum.ts.hbs)

```handlebars
{{#enum}}
enum {{@name}} {
  {{#value}}
    {{@name}}: {{@number}}
  {{/value}}
}
{{/enum}}
```

#### [{{service}}](examples/templates/service.ts.hbs)

```handlebars
{{#service}}
interface {{@name}} {
  // do stuff
}
{{/service}}
```

#### [{{rpc}}](examples/templates/rpc.ts.hbs)

```handlebars
{{#rpc}}
  // TODO: convert input and output type
  const {{@name}} = (request: {{@input}}): Promise<{{@output}}> => {
    // do stuff
  }
{{/rpc}}

// filter by request/response type
{{#rpc client="unary" server="stream"}}
  // TODO: convert input and output type
  const {{@name}} = (request: {{@input}}, (response: {{@output}} => void): Promise<void>
{{/rpc}}
```

#### [{{option}}](examples/templates/option.ts.hbs)

```handlebars
{{#message}}
const {{@name}} = {
  {{#field}}
  {{@name}}: {{#option name="jsonType"}}{{@value}}{{/option}},
  {{/field}}
}
{{/message}}
```


## Contributing

Make PRs and have fun 👻

## Examples

See examples directory [here](examples)

## License

This project is licensed under Apache 2.0 - see [LICENSE](LICENSE) file for details
