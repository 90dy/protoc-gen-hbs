#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const dree = require('dree')
const fs = require('fs')
const pbHelpers = require('./protobuf')
const caseHelpers = require('./case')
const path = require('path')

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
	const templateDir = path.resolve(request.getParameter() || process.cwd() + '/templates')

	dree.scan(request.getParameter() || process.cwd() + '/templates', { extensions: ['hbs'] }, template => {
		templateMap[template.path] = {}
		Object.values(fileDescriptorMap).forEach((fileDescriptor) => {
			let output = ''
			let mustaches = (decodeURIComponent(template.name).match(/{{.*}}/) || [''])[0]
			if (mustaches) {
				output = handlebars.compile(mustaches, handlebarsOptions)(request, templateOptions)
			} else {
				output = template.name + '\n'
			}
			output.split('\n').filter(_ => _).forEach(_ => {
				const fileDescPath = path.dirname(fileDescriptor.getName())
				const templateSubPath =  path.dirname(template.path).replace(templateDir, '')
				let fileName = template.name
				if (mustaches) {
					fileName = fileName.split(mustaches)
					fileName.splice(1, 0, _)
					fileName = fileName.join('')
				}
				fileName = fileName.replace(/\.hbs$/, '')
				fileName = fileName.replace(fileDescPath, '')
				fileName = path.join(fileDescPath, templateSubPath, fileName)

				if (!templateMap[template.path][fileName]) {
					templateMap[template.path][fileName] = (() => {
							const templateRequest = request.clone()
							templateRequest.setFileToGenerateList([
								fileDescriptor.getName()
							])
							return templateRequest
						})()
				} else {
					templateMap[template.path][fileName]
						.addFileToGenerate(fileDescriptor.getName())
				}
			})
		})
	})

	Object.entries(templateMap).forEach(([path, fileNameMap]) =>
		Object.entries(fileNameMap).forEach(([name, request]) => {
			try {
				// let mustachesContent = (decodeURIComponent(path).match(
				// 	/{{(import|file|package|enum|value|message|field|oneof|option|service|rpc|extension)}}/
				// ) || [,''])[1]
				// let templateContext =
				// if (mustachesContent) {
				// 	template
				// }
				const file = new CodeGeneratorResponse.File()
				file.setName(name)
				file.setContent(handlebars.compile(fs.readFileSync(path, 'utf8'), handlebarsOptions)(request, templateOptions))
				response.addFile(file)
			} catch (error) {
				error.message = 'Template ' + path + ': ' + error.message
				throw error
			}
		})
	)

	process.stdout.write(Buffer.from(response.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
