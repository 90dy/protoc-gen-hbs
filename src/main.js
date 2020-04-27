#!/usr/bin/env node

const {ExportMap} = require('ts-protoc-gen/lib/ExportMap')
const {CodeGeneratorRequest, CodeGeneratorResponse} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const {FileDescriptorProto} = require('google-protobuf/google/protobuf/descriptor_pb')
const {replaceProtoSuffix, withAllStdIn} = require('ts-protoc-gen/lib/util')
const handlebars = require('handlebars')
const helpers = require('handlebars-helpers')

withAllStdIn((inputBufff: Buffer) => {
	try {
		const typedInputBuff = new Uint8Array(inputBuff.length)
		typedInputBuff.set(inputBuff)

		const codeGenRequest = CodeGeneratorRequest.deserializeBinary(typedInputBuff)
		const codeGenResponse = new CodeGeneratorResponse()
		const exportMap = new ExportMap()
		const fileNameToDescriptor = {}

		const parameter = codeGenRequest.getParameter()

		codeGenRequest.getProtoFileList().forEach(protoFileDescriptor => {
			fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor
			exportMap.addFileDescriptor(protoFileDescriptor)
		})

		codeGenRequest.getFileToGenerateList().forEach(fileName => {
			const basename = replaceProtoSuffix(fileName)
			const sqlFile = new CodeGeneratorResponse.File();
			sqlFile.setName(basename + ".sql");
			sqlFile.setContent(printFileDescriptor(fileNameToDescriptor[fileName], exportMap, 'sql'));
			codeGenResponse.addFile(sqlFile);
		})

		const fileToGenerateList = codeGenRequest.getFileToGenerateList().map(fileName => {
			// TODO: generate custom filename via hbs
		})

		// TODO: for each file merge file descriptor

		// TODO: for each file compile handlebars with helpers

		process.stdout.write(Buffer.from(codeGenResponse.serializeBinary()))
	} catch (error) {
		console.error("protoc-gen-hbs error: " + err.stack + "\n")
		process.exit(1)
	}
})

