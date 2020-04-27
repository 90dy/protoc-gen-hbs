#!/usr/bin/env node

const {filePathToPseudoNamespace, replaceProtoSuffix, getPathToRoot} = require("ts-protoc-gen/lib/util")
const {ExportMap} = require("ts-protoc-gen/lib/ExportMap")
const {Printer} = require("ts-protoc-gen/lib/Printer")
const {FileDescriptorProto} = require("google-protobuf/google/protobuf/descriptor_pb")
const {WellKnownTypesMap} = require("ts-protoc-gen/lib/WellKnown")

export function printFileDescriptor(fileDescriptor, exportMap, plugin) {
	const plugin = require('./'+ plugin)

	const fileName = fileDescriptor.getName()
	const packageName = fileDescriptor.getPackage()

	const printer = new Printer(0)

	printer.printLn('// package: ' + packageName + '')
	printer.printLn('// file: ' + fileDescriptor.getName() + '')

	const upToRoot = getPathToRoot(fileName)

	printer.printEmptyLn()

	fileDescriptor.getDependencyList().forEach((dependency) => {
		const pseudoNamespace = filePathToPseudoNamespace(dependency)
		if (dependency in WellKnownTypesMap) {
		} else {
			const filePath = replaceProtoSuffix(dependency)
		}
	})

	printer.print(plugin.printPackage(fileName, exportMap, messageType, 0, fileDescriptor))

	fileDescriptor.getMessageTypeList().forEach(messageType => {
		printer.print(plugin.printMessage(fileName, exportMap, messageType, 0, fileDescriptor))
	})

	fileDescriptor.getExtensionList().forEach(extension => {
		printer.print(plugin.printExtension(fileName, exportMap, extension, 0))
	})

	fileDescriptor.getEnumTypeList().forEach(enumType => {
		printer.print(plugin.printEnum(enumType, 0))
	})

	printer.printEmptyLn()

	return printer.getOutput()
}

