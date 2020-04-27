# protoc-gen-hbs

🏃‍♀️ Fast and simple protobuf generation with handlebars (and some helpers)

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
* Knowing how protobuf descriptors are structured is useless
* Make protobuf developpers happy :smile:

## Installation

First, install [protoc](http://google.github.io/proto-lens/installing-protoc.html)

Then type:

```bash
yarn global add protoc-gen-hbs
```

or

```bash
npm install --global protoc-gen-hbs
```

## Usage

```
protoc --hbs_out="." [-I<proto_paths>...] <proto_files>...
```

## Helpers

* Helpers creates inline partials ([see also](https://handlebarsjs.com/guide/partials.html))
* You can use either `{{#name-of-helper}}` and `{{#*inline "name-of-helper"}}`
* Helpers can take a string argument to filter them
* Helper used inside another helper will be available inside current scope only
* If you set `{{> @partial-block}}` inside it will add nested partial automatically

### [{{import}}](src/import.js)

```handlebars
{{#import}}
include "{{stem name}}.pb.h"
{{/import}}
```

### [{{package}}](src/package.js)

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

### [{{message}}](src/message.js)

```handlebars
{{#message}}
class {{name}} {}
{{/message}}

{{#message "google.protobuf.Timestamp"}}
class {{name}} extends DateTime {}
{{/message}}
```

### [{{field}}](src/field.js)

```handlebars
{{#field}}
	{{name}}: {{> scalar}}
{{/field}}
```

### [{{enum}}](src/enum.js)

```handlebars
{{#enum}}
enum {{name}} {
	{{> field}}
}
{{/enum}}
```

### [{{scalar}}](src/scalar.js)

```handlebars
{{#scalar}}
	{{#string}}string{{/string}}
	{{#bool}}boolean{{/bool}}
	...
{{/scalar}}
```

### [{{service}}](src/service.js)

```handlebars
{{#service}}
interface {{name}} {
	{{> rpc}}
}
{{/service}}
```

### [{{rpc}}](src/rpc.js)

```handlebars
{{#rpc}}
{{name}}(request: {{request}}) -> {{response}}
{{/rpc}}
```

## Examples

See examples directory [here](examples)
