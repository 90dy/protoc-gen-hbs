# protoc-gen-hbs

🏃‍♀️ Easy and Fast Protobuf Generation with Handlebars and some Helpers

## Why ?

This project aims to be the simplest way to generate api, model and whatever based on protobuf for any languages.
Protobuf based generation can really improve productivity of developers, and a lot of tools already exists in that way.
But, it is really painful to generate custom things or create plugin with imperative languages.
This is where template languages are useful.
But there is another problem.
After releasing and using [pbhbs](https://github.com/gponsinet/pbhbs), I realised that every templates I did was not maintainable and this was a mess to re-create new ones.
This is why this project exists.

## Philosophy

* Developer Experience First

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
protoc --hbs_out="[<template_dir>:]<out_dir>" [-I<proto_paths>...] <proto_files>..

Options:
  out_dir         Path where to generate output files
  templates_dir   Path where to store templates (default: ./templates)
  proto_paths     Paths where to find your protos
  proto_files     Proto files to use for generation
```

### Templates

#### Paths Definition

Path definition is very free to you, all you must know is that we parse it to send the right context and create the right path to generate files.

Some examples:

* `whatever.ext.hbs` will generate `whatever.ext` with all `proto_files` as context
* `{{file}}.ext.hbs` will generate one file by `proto_files` and send the right file as context
* `{{import}}.ext.hbs` will generate one file by `import` (don't know if it's really useful but yes it's possible)
* `{{file}}/{{message}}.ext.hbs` will generate one file by `message` and send the message as context and `<file>` as path
* `{{file}}/{{service}}/{{rpc}}.ext.hbs` will generate one file by rpc with the right context and `<file>/<service>` as path
* ...

### Helpers

#### Protobuf

Protobuf helpers was thought as easy to use as possible
* They are all iterators
* They can take parameters as arguments to filter by name or specific field
* Parameters can be globs for strings

##### [{{import}}](templates/examples/import.ts.hbs)

```handlebars
{{#import}}
include "{{@name}}.pb.h"
{{/import}}
```

##### [{{package}}](templates/examples/package.ts.hbs)

```handlebars
{{#package}}
namespace {{@name}} {
  // will add nested message, enum and fields
}
{{/package}}

{{#package name="google.*"}}
  // {{@name}}
{{else}}
  // ...
{{/package}}
```

##### [{{message}}](templates/examples/message.ts.hbs)

```handlebars
// Display messages name
{{#message}}
  {{@name}}
{{/message}}

// Filter by name
{{#message name="google.protobuf.Timestamp"}}
class {{@name}} extends DateTime {}
{{else}}
class {{@name}} {}
{{/message}}

// By default children will get parents name as prefix
{{#message}}
  {{@name}}
{{/message}}

// Is equal to
{{#service}}
  {{#message}}
  {{@service.name}}.{{@name}}
  {{/message}}
{{/service}}

// You can access nested message this way
{{#message}}
  {{#nested}}
    {{@name}}
  {{/nested}}
{{/message}}

// Or recursively
{{#message}}
  {{@name}}
  {{@recursive}}
{{/message}}
```

##### [{{field}}](templates/examples/field.ts.hbs)

```handlebars
{{#message}}
  {{#field}}
    {{@name}}: {{@type}}
  {{/field}}
{{/message}}

// You can filter fields by label and/or type
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

##### [{{extension}}](templates/examples/extension.ts.hbs)

```handlebars
// Work exactly like field
{{#message}}
  {{#extension}}
    {{@name}}: {{@type}}
  {{/extension}}
{{/message}}
```

##### [{{enum}}](templates/examples/enum.ts.hbs)

```handlebars
{{#enum}}
enum {{@name}} {
  {{#value}}
    {{@name}}: {{@number}}
  {{/value}}
}
{{/enum}}
```

##### [{{service}}](templates/examples/service.ts.hbs)

```handlebars
{{#service}}
interface {{@name}} {
  // do stuff
}
{{/service}}
```

##### [{{rpc}}](templates/examples/rpc.ts.hbs)

```handlebars
{{#rpc}}
  // TODO: convert input and output type
  const {{@name}} = (request: {{@input}}): Promise<{{@output}}> => {
    // do stuff
  }
{{/rpc}}

// You can filter by request/response type
{{#rpc client="unary" server="stream"}}
  // TODO: convert input and output type
  const {{@name}} = (request: {{@input}}, (response: {{@output}} => void): Promise<void>
{{/rpc}}
```

##### [{{option}}](templates/examples/option.ts.hbs)

```handlebars
// You can filter by option like this
{{#service}}
  {{#option deprecated=true}}
    // Do stuff
  {{/option}}
{{/service}}

// Or
{{#service deprecated=true}}
  // Do stuff
{{/service}}

// You can also access it directly
{{#message}}
  {{#field}}
    {{@jsonName}}
  {{/field}}
{{/message}}
```

#### Others

For helpers not related with protobuf

* All [handlebars-helpers](helpers/handlebars-helpers) have been included
* Better string case helpers have been added too (see [here](src/case.js))


## Contributing

Make PRs and have fun 👻

## Examples

See examples directory [here](examples)

## License

This project is licensed under Apache 2.0 - see [LICENSE](LICENSE) file for details
