#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const dree = require('dree')
const fs = require('fs')
const pbHelpers = require('./protobuf')
const caseHelpers = require('./case')

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
const templateOptions = {
	allowProtoMethodsByDefault: true,
}

handlebarsHelpers({ handlebars })
caseHelpers.register(handlebars)
pbHelpers.register(handlebars)

try {
	const requestBuffer = fs.readFileSync(0)
	const requestUint8Array = new Uint8Array(requestBuffer.length)
	requestUint8Array.set(requestBuffer)

	const request = CodeGeneratorRequest.deserializeBinary(requestUint8Array)
	const response = new CodeGeneratorResponse()

	const fileDescriptorMap = request.getFileToGenerateList().reduce((map, name) => {
		map[name] = request.getProtoFileList().find(_ => _.getName() === name)
		return map
	}, {})

	const templateMap = {}

	dree.scan(request.getParameter() || process.cwd(), { extensions: ['hbs'] }, template => {
		Object.values(fileDescriptorMap).forEach((fileDescriptor) => {
			let output = ''
			let mustaches = (decodeURIComponent(template.name).match(/{{.*}}/) || [''])[0]
			if (mustaches) {
					output = handlebars.compile(mustaches, handlebarsOptions)(fileDescriptor, templateOptions)
			} else {
				filename = template.name
			}
			output.split(',').forEach(_ => {
				let fileName = template.name
				fileName = fileName.split(mustaches)
				fileName.splice(1, 0, _)
				fileName = fileName.join('')
				fileName = fileName.replace(/\.hbs$/, '')
				if (!templateMap[fileName]) {
					templateMap[fileName] = {
						path: template.path,
						request: (() => {
							const templateRequest = request.clone()
							templateRequest.setFileToGenerateList([])
							return templateRequest
						})(),
					}
				}
				templateMap[fileName].request.addFileToGenerate(fileDescriptor.getName())
			})
		})
	})

	Object.entries(templateMap).forEach(([name, { path, request }]) => {
		const file = new CodeGeneratorResponse.File()
		file.setName(name)
		file.setContent(handlebars.compile(fs.readFileSync(path, 'utf8'), handlebarsOptions)(request, templateOptions))
		response.addFile(file)
	})

	process.stdout.write(Buffer.from(response.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
