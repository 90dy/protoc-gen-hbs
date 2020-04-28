#!/usr/bin/env node

const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const handlebars = require('handlebars')
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

const handlebarsHelpers = [
	require('./import'),
	// require('./package'),
	// require('./message'),
	// require('./scalar'),
	// require('./enum'),
	// require('./service'),
	// require('./rpc'),
]

handlebarsHelpers.forEach(helper => helper.register(handlebars))

const inputBuff = fs.readFileSync(0, 'utf-8')

try {
	const typedInputBuff = new Uint8Array(inputBuff.length)
	typedInputBuff.set(inputBuff)

	const codeGenRequest = CodeGeneratorRequest.deserializeBinary(typedInputBuff)
	const codeGenResponse = new CodeGeneratorResponse()

	const responseFileMap = {}
	dree.scan(codeGenRequest.getParameter() || process.cwd(), { extensions: ['hbs'] }, template => {
		codeGenRequest.getFileToGenerateList().forEach(file => {
			let name = ''
			try {
				name = handlebars.compile(template.name.replace(/\.hbs$/, ''), handlebarsOptions)(file)
			} catch (err) {
				throw new Error(err.message + 'for template ' + template.name + ' when generating file name')
			}
			responseFileMap[name] = responseFileMap[name] || ''
			try {
				responseFileMap[name] += handlebars.compile(fs.readFileSync(template.path, 'utf8'), handlebarsOptions)(file)
			} catch (err) {
				throw new Error(err.message + ' for template ' + template.name + ' line ' + err.lineNumber)
			}
		})
	})

	Object.entries(responseFileMap).forEach(([name, content]) => {
		const file = new CodeGeneratorResponse.File()
		file.setName(name)
		file.setContent(content)
		codeGenResponse.addFile(file)
	})

	process.stdout.write(Buffer.from(codeGenResponse.serializeBinary()))
} catch (err) {
	console.error("protoc-gen-hbs error: " + err.stack + "\n")
	process.exit(1)
}
