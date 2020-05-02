# protoc-gen-hbs

🏃‍♀️ Fast and simple protobuf generation with handlebars and some helpers

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
protoc --hbs_out="." [-I<proto_paths>...] <proto_files>...
```

### Template

* Template file name can be of the form:
  * `whatever.hbs` to aggregate every proto file
  * `{{file}}.ext.hbs` to generate one file by proto file
  * `{{package}}.ext.hbs` to generate one file by package
  * `{{service}}.ext.hbs` to generate one file by service
  * `{{#whatever}}{{/whatever}}.hbs` is not really recommended, but if needed, use encodeURI over it for your file system
* Each template get CodeGeneratorRequest as input with:
  * all file descriptors from input and imported (as protoc does with plugins)
  * list only the current proto file used for the template in `file_to_generate`
  * For more information look at [CodeGeneratorRequest](https://github.com/protocolbuffers/protobuf/blob/4059c61f27eb1b06c4ee979546a238be792df0a4/src/google/protobuf/compiler/plugin.proto#L68) and [FileDescriptorProto]((https://github.com/protocolbuffers/protobuf/blob/4059c61f27eb1b06c4ee979546a238be792df0a4/src/google/protobuf/descriptor.proto#L62)

### Helpers

* Helpers can take a string argument to filter the descriptors used
* Nested helpers override others inside current scope
* For helpers not related with protobuf
	* all [handlebars-helpers](helpers/handlebars-helpers) have been included
	* better string case helpers have been added too (see [here](src/case.js))

#### [{{import}}](src/import.js)

```handlebars
{{#import}}
include "{{@name}}.pb.h"
{{/import}}
```

#### [{{package}}](src/package.js)

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

#### [{{message}}](src/message.js)

```handlebars
{{#message "google.protobuf.Timestamp"}}
class {{@name}} extends DateTime {}
{{else}}
class {{@name}} {}
{{/message}}
```

* By default children will get parents name as prefix:

```handlebars
{{#message}}
  {{@name}}
{{/message}}
```

equals

```handlebars
{{#service}}
  {{#message}}
  {{@service.name}}.{{@name}}
  {{/message}}
{{/service}}
```


#### [{{field}}](src/field.js)

```handlebars
{{#field}}
const {{@name}}: {{@type}} = null
{{/field}}
```

* You can filter fields by label or type

```handlebars
{{#field label="repeated"}}
const {{@name}}: Array<{{@type}}> = []
{{/field}}

{{#field type="string"}}
const {{@name}}: string = ''
{{/field}}

{{#field label="optional" type="number"}}
const {{@name}}: number? = undefined
{{/field}}
```

#### [{{enum}}](src/enum.js)

```handlebars
{{#enum}}
enum {{@name}} {
  {{#value}}
    {{@name}}: {{@number}}
  {{/value}}
}
{{/enum}}
```

#### [{{service}}](src/service.js)

```handlebars
{{#service}}
interface {{@name}} {
  // do stuff
}
{{/service}}
```

#### [{{rpc}}](src/rpc.js)

```handlebars
{{#rpc}}
  const {{@name}} = (request: {{@request.type}}): Promise<{{@response.type}}> => {
    // do stuff
  }
{{/rpc}}

// filter by request/response type
{{#rpc client="unary" server="stream"}}
  const {{@name}} = (request: {{@request.type}}, (response: {{@response.type}}) => void): Promise<void>
{{/rpc}}
```

#### [{{option}}](src/option.js)

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
