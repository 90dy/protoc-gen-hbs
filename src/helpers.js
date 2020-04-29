const glob = require('glob')
const {CodeGeneratorRequest} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const {
	FileDescriptorProto,
	DescriptorProto,
	EnumDescriptorProto,
	FieldDescriptorProto,
	OneofDescriptorProto,
	ServiceDescriptorProto,
	MethodDescriptorProto,
} = require('google-protobuf/google/protobuf/descriptor_pb')
const mem = require('mem')

const mapFileToGenerateDescriptorList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			return context.getProtoFileList().filter(
				fileDesc => context.getFileToGenerateList().find(
					fileName => fileDesc.name === fileName && mapfileDesc
				)
			)
		case FileDescriptorProto:
			return callback(context)
		case DescriptorProto:
		case EnumDescriptorProto:
		case FieldDescriptorProto:
		case OneofDescriptorProto:
		case ServiceDescriptorProto:
		case MethodDescriptorProto:
		default:
			return
	}
}

const mapDependencyList = (context, options, callback) => {
	return mapFileToGenerateDescriptorList(context, options, fileDesc => {
		return fileDesc.getDependencyList().map(callback)
	}).flat(Infinity)
}

const mapPackageList = (context, options, callback) => {
	const packageList = {}
	return mapFileToGenerateDescriptorList(context, options, fileDesc => {
		if (packageList[fileDesc.package]) {
			packageList[fileDesc.package].addFileToGenerate(fileDesc.getName())
		} else {
			packageList[fileDesc.package] = new CodeGeneratorRequest({ ...options.data.root, fileToGenerateList: [fileDesc.getName()] })
			return packageList[fileDesc.package]
		}
	}).map(callback)
}

const mapMessageList = (context, options, callback) => {
	console.error(context.toObject())
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getNestedTypeList().map(callback)
		case FileDescriptorProto:
			return context.getMessageTypeList().map(callback)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapMessageList(fileDesc, options, mapName(fileDesc, callback))
			}).flat(Infinity)
	}
}

const mapEnumList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getEnumTypeList().map(callback)
		case FileDescriptorProto:
			return context.getEnumTypeList().map(callback)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapEnumList(fileDesc, options, mapName(fileDesc, callback))
			}).flat(Infinity)
	}
}

const mapServiceList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case FileDescriptorProto:
			return context.getServiceList().map(callback)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapServiceList(fileDesc, options, mapName(fileDesc, callback))
			}).flat(Infinity)
	}
}

const mapOptionList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case MethodDescriptorProto:
		case FieldDescriptorProto:
		case DescriptorProto:
		case FileDescriptorProto:
			return Object.entries(Object.entries(context.getOptions())).map(
				([index, [key, value]]) => callback(value, index, arr, key)
			)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapOptionList(fileDesc, options, mapName(fileDesc, callback))
			})
	}
}

const mapFieldList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getFieldList().map(callback)
		case FileDescriptorProto:
			return context.getMessageTypeList().map(message => {
				return mapFieldList(message, options, mapName(message, callback))
			})
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapFieldList(fileDesc, options, mapName(fileDesc, callback))
			})
	}
}

const mapExtensionList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
		case FileDescriptorProto:
			return context.getExtensionList().map(callback)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapExtensionList(fileDesc, options, callback)
			}).flat(Infinity)
	}
}

const mapRPCList = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case ServiceDescriptorProto:
			return context.getMethodList().map(callback)
		case FileDescriptorProto:
			return context.getServiceList().map(service => {
				return mapRPCList(service, options, mapName(service, callback))
			}).flat(Infinity)
		default:
			return mapFileToGenerateDescriptorList(context, options, fileDesc => {
				return mapRPCList(fileDesc, options, callback)
			}).flat(Infinity)
	}
}

const mapName = (context, options, callback) => (object, index, array, key) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest.name:
			if (context !== options.data.root) {
				return callback(object, index, array, key)
			}
		default:
			return callback(new Object.getPrototypeOf(object).constructor({
				...object,
				name: (context.getPackage || context.getName)() + '.' + object.getName()
			}), index, array, key)
	}
}

const mapHelperFunction = fn => (value, index, array, key) => {
	return fn(value, {
		key,
		index,
		first: index === 0,
		last: index === array.length - 1,
	})
}

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		return mapDependencyList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('file', function (options) {
		return mapFileToGenerateDescriptorList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('package', function (options) {
		return mapPackageList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('message', function (options) {
		return mapMessageList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('enum', function (options) {
		return mapEnumList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('field', function (options) {
		return mapFieldList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('option', function (options) {
		return mapOptionList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('service', function (options) {
		return mapServiceList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('rpc', function (options) {
		return mapRPCList(this, options, mapHelperFunction(options.fn))
	})
	handlebars.registerHelper('scalar', function (options) {
		// TODO
	})
	handlebars.registerHelper('extension', function (options) {
		return mapExtensionList(this, options, mapHelperFunction(options.fn))
	})
}
