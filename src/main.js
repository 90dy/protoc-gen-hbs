#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const dree = require('dree')
const fs = require('fs')
const helpers = require('./helpers')

const handlebarsOptions = {
	// data: false,
	// compat: true,
	// knownHelpers: '',
	// knownHelpersOnly: true,
	noEscape: true,
	// strict: false,
	// assumeObjects: true,
	// ignoreStandalone: true,
	// explicitPartialContext: true,
}

handlebarsHelpers({ handlebars })
helpers.register(handlebars)

const requestBuffer = fs.readFileSync(0)

try {
	const requestUint8Array = new Uint8Array(requestBuffer.length)
	requestUint8Array.set(requestBuffer)

	const request = CodeGeneratorRequest.deserializeBinary(requestUint8Array).toObject()
	const response = new CodeGeneratorResponse()

	const fileDescriptorMap = request.fileToGenerateList.reduce((map, name) => {
		map[name] = request.protoFileList.find(_ => _.name === name)
		return map
	}, {})

	const templateRequestMap = {}

	dree.scan(request.parameter || process.cwd(), { extensions: ['hbs'] }, template => {
		Object.values(fileDescriptorMap).forEach((fileDescriptor) => {
			let templateRequestName = ''
			try {
				templateRequestName = handlebars.compile(decodeURIComponent(template.name.replace(/\.hbs$/, '')), handlebarsOptions)(fileDescriptor)
			} catch (err) {
				throw new Error(err.message + 'for template ' + template.name + ' when generating file name')
			}
			if (templateRequestMap[templateRequestName]) {
				templateRequestMap[templateRequestName].request.addFileToGenerate(fileDescriptor.name)
			} else {
				templateRequestMap[templateRequestName] = {
					path: template.path,
					request: new CodeGeneratorRequest({ ...request, fileToGenerateList: [fileDescriptor.name] })
				}
			}
		})
	})

	Object.entries(templateRequestMap).forEach(([name, { path, request }]) => {
		try {
			const file = new CodeGeneratorResponse.File()
			file.setName(name)
			file.setContent(handlebars.compile(fs.readFileSync(path, 'utf8'), handlebarsOptions)(request))
			response.addFile(file)
		} catch (err) {
			console.error(path + ':', err)
			process.exit(1)
		}
	})
	process.stdout.write(Buffer.from(response.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
