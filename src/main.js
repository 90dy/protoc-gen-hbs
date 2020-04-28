#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const dree = require('dree')
const fs = require('fs')

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

const handlebarsProtobufHelpers = [
	require('./import'),
	// require('./file'),
	// require('./package'),
	// require('./message'),
	// require('./scalar'),
	// require('./enum'),
	// require('./service'),
	// require('./rpc'),
]

handlebarsHelpers({ handlebars })
handlebarsProtobufHelpers.forEach(helper => helper.register(handlebars))

const requestBuffer = fs.readFileSync(0, 'utf-8')

try {
	const requestUint8Array = new Uint8Array(requestBuffer.length)
	requestUint8Array.set(requestBuffer)

	const request = CodeGeneratorRequest.deserializeBinary(requestUint8Array)
	const response = new CodeGeneratorResponse()

	const fileDescriptorMap = request.getFileToGenerateList().reduce((map, name) => {
		map[name] = request.getProtoFileList().find(_ => _.getName() === name)
		return map
	}, {})

	const templateRequestMap = {}

	dree.scan(request.getParameter() || process.cwd(), { extensions: ['hbs'] }, template => {
		Object.values(fileDescriptorMap).forEach((fileDescriptor) => {
			let templateRequestName = ''
			try {
				templateRequestName = handlebars.compile(decodeURIComponent(template.name.replace(/\.hbs$/, '')), handlebarsOptions)(fileDescriptor)
			} catch (err) {
				throw new Error(err.message + 'for template ' + template.name + ' when generating file name')
			}
			if (templateCodeGenRequest[templateRequestName]) {
				templateRequestMap[templateRequestName].addFileToGenerate(name)
			} else {
				templateRequestMap[templateRequestName] = new CodeGeneratorRequest({ ...request, fileToGenerateList: [fileDescriptor.name] })
			}
		})
	})

	Object.entries(templateRequestMap).entries(([name, templateRequest]) => {
		try {
			const file = new CodeGeneratorResponse.File()
			file.setName(name)
			file.setContent(handlebars.compile(fs.readFileSync(template.path, 'utf8'), handlebarsOptions)(templateRequest))
			response.addFile(file)
		} catch (err) {
			throw new Error(err.message + ' for template ' + template.name + ' line ' + err.lineNumber)
		}
	})

	process.stdout.write(Buffer.from(response.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
