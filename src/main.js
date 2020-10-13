#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const dree = require('dree')
const fs = require('fs')
const pbHelpers = require('./protobuf')
const caseHelpers = require('./case')
const path = require('path')
const sha1 = require('sha1')

const handlebarsOptions = {
	// data: false,
	// compat: true,
	// knownHelpers: '',
	// knownHelpersOnly: true,
	noEscape: true,
	// strict: false,
	// assumeObjects: true,
	// preventIndent: true,
	// ignoreStandalone: true,
	// explicitPartialContext: true,
}
const templateOptions = {
	allowProtoMethodsByDefault: true,
}

handlebarsHelpers({ handlebars })
caseHelpers.register(handlebars)
pbHelpers.register(handlebars)

const compileMustaches = (request, mustaches, handlebarsOptions, templateOptions) =>
	handlebars.compile(mustaches, handlebarsOptions)(request, templateOptions)

try {
	const requestBuffer = fs.readFileSync(0)
	const requestUint8Array = new Uint8Array(requestBuffer.length)
	requestUint8Array.set(requestBuffer)

	const request = CodeGeneratorRequest.deserializeBinary(requestUint8Array)
  // TODO: Add all included files with request.setProtoFileList
  // console.error(request.getProtoFileList().map( _ => _.getName()))

	// get templates
	const templates = {
		directory: '',
		list: [],
	}
	templates.directory = path.resolve(request.getParameter() || './templates'),
	templates.list = (() => {
		const _ = []
		dree.scan(templates.directory, { extensions: ['hbs'] }, template => _.push(template))
		return _.map(template => {
			template.relativePath = path.relative(templates.directory, template.path)
			return template
		})
	})()

	// decode relative path
	templates.list.map(template => {
		template.decodedRelativePath = decodeURIComponent(template.relativePath)
		return template
	})

	// compile template
	templates.list = templates.list.map(template => {
		template.mustaches = template.decodedRelativePath.match(
			/{{.*import|file|package|enum|value|message|field|oneof|option|service|rpc|extension.*}}/g
		) || []
		template.mustachesContent = template.mustaches.map(mustache => mustache.replace('{{', '').replace('}}', ''))
		template.start = template.mustachesContent.map(_ => '{{#' + _ + '}}').join('')
		template.end = template.mustachesContent.map(_ => '{{/' + _ + '}}').reverse().join('')
		template.contentName = template.decodedRelativePath.replace(
			/{{(.*?)(import|file|package|enum|value|message|field|oneof|option|service|rpc|extension)}}/g,
			'{{$1@$2.name}}'
		).replace(/.hbs$/, '') + '\n'
		template.content = fs.readFileSync(template.path, 'utf8')
		template.delimiterStart = 'PROTOC_GEN_HBS_GENERATED_FILE:' + sha1(template.content) + ':' + template.contentName
		template.delimiter = 'PROTOC_GEN_HBS_GENERATED_FILE:' + sha1(template.content) + ':' + template.contentName
		template.mergedContent =
			template.start +
			template.delimiter +
			template.content +
			template.end
		try {
			template.result = compileMustaches(
				request,
				template.mergedContent,
				handlebarsOptions,
				templateOptions,
			)
			return template
		} catch (error) {
			error.message = 'Template ' + template.relativePath + ': ' + error.message
			throw error
		}
	})
  // console.error(templates)

	// create generated files
	const generatedFiles = {}
	templates.list.map(template => {
		const list = template.result.split(
			'PROTOC_GEN_HBS_GENERATED_FILE:' + sha1(template.content) + ':'
		).filter(_ => _ !== '')
		list.forEach(content => {
			const [filename] = content.split('\n')
			if (filename != '') {
        generatedFiles[filename] = generatedFiles[filename]
          ? generatedFiles[filename] + content.replace(new RegExp('^' + filename), '')
          : content.replace(new RegExp('^' + filename), '')
			}
		})
	})
	// console.error(generatedFiles)

	// send response
	const response = new CodeGeneratorResponse()
	Object.entries(generatedFiles).forEach(([name, content]) => {
		const file = new CodeGeneratorResponse.File()
		file.setName(name)
		file.setContent(content)
		response.addFile(file)
	})

	process.stdout.write(Buffer.from(response.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
