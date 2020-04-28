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

* Simple and understable templates
* Less configs as possible
* Knowing how protobuf descriptors are structured must be useless
* Make protobuf developpers happy :smile:

## Installation

First, install protoc: http://google.github.io/proto-lens/installing-protoc.html

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
	* `{{filename}}.ext.hbs` to generate one file by proto file
	* `{{package}}.ext.hbs` to generate one file by package
	* `{{#whatever}}{{/whatever}}.hbs` is not really recommended, but if needed, use encodeURI over it for your file system
* Each template get CodeGeneratorRequest as input with:
	* all file descriptors from input and imported (as protoc does with plugins)
	* list only the current proto file used for the template in `file_to_generate`
	* For more information look at [CodeGeneratorRequest](https://github.com/protocolbuffers/protobuf/blob/4059c61f27eb1b06c4ee979546a238be792df0a4/src/google/protobuf/compiler/plugin.proto#L68) and [FileDescriptorProto]((https://github.com/protocolbuffers/protobuf/blob/4059c61f27eb1b06c4ee979546a238be792df0a4/src/google/protobuf/descriptor.proto#L62)

### Helpers

* Helpers can take a string argument to filter the descriptors used
* Nested helpers override others inside current scope
* For helpers not related with protobuf, all [handlebars-helpers](helpers/handlebars-helpers), are included

#### [{{import}}](src/import.js)

```handlebars
{{#import}}
include "{{name}}.pb.h"
{{/import}}
```

#### [{{package}}](src/package.js)

```handlebars
{{#package}}
namespace {{name}} {
	// will add nested message, enum and fields
	{{> @partial-block}}
}
{{/package}}

{{#package "google.*"}}
	// {{name}}
{{/package}}
```

#### [{{message}}](src/message.js)

```handlebars
{{#message}}
class {{name}} {}
{{/message}}

{{#message "google.protobuf.Timestamp"}}
class {{name}} extends DateTime {}
{{/message}}
```

#### [{{field}}](src/field.js)

```handlebars
{{#field}}
	{{name}}: {{> scalar}}
{{/field}}
```

#### [{{enum}}](src/enum.js)

```handlebars
{{#enum}}
enum {{name}} {
	{{> field}}
}
{{/enum}}
```

#### [{{scalar}}](src/scalar.js)

```handlebars
{{#scalar}}
	{{#string}}string{{/string}}
	{{#bool}}boolean{{/bool}}
	...
{{/scalar}}
```

#### [{{service}}](src/service.js)

```handlebars
{{#service}}
interface {{name}} {
	{{> rpc}}
}
{{/service}}
```

#### [{{rpc}}](src/rpc.js)

```handlebars
{{#rpc}}
{{name}}(request: {{request}}) -> {{response}}
{{/rpc}}
```

## Contributing

Make PRs and have fun 👻

## Examples

See examples directory [here](examples)
