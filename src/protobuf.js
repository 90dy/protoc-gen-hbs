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

const mapFile = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			return context.getProtoFileList().filter(
				fileDesc => context.getFileToGenerateList().find(
					fileName => fileDesc.getName() === fileName
				)
			).map(callback)
		case FileDescriptorProto:
			return [context].map(callback)
		default:
			return []
	}
}
module.exports.mapFile = mapFile

const mapDependency = (context, options, callback) => {
	return mapFile(context, options, fileDesc => {
		return fileDesc.getDependencyList().map(callback)
	}).flat(Infinity)
}
module.exports.mapDependency = mapDependency

const mapPackage = (context, options, callback) => {
	const packageList = {}
	return mapFile(context, options, fileDesc => {
		if (!packageList[fileDesc.package]) {
			packageList[fileDesc.package] = options.data.root.clone()
			packageList[fileDesc.package].setFileToGenerateList([fileDesc.getName()])
			return packageList[fileDesc.package]
		}
		packageList[fileDesc.package].addFileToGenerate(fileDesc.getName())
	}).map(callback)
}
module.exports.mapPackage = mapPackage

const mapMessage = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getNestedTypeList().map(callback)
		case FileDescriptorProto:
			return context.getMessageTypeList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapMessage(fileDesc, options, applyAsParentContext(fileDesc, options, callback))
			}).flat(Infinity)
	}
}
module.exports.mapMessage = mapMessage

const mapEnum = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getEnumTypeList().map(callback)
		case FileDescriptorProto:
			return context.getEnumTypeList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapEnum(fileDesc, options, applyAsParentContext(fileDesc, options, callback))
			}).flat(Infinity)
	}
}
module.exports.mapEnum = mapEnum

const mapService = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case FileDescriptorProto:
			return context.getServiceList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapService(fileDesc, options, applyAsParentContext(fileDesc, options, callback))
			}).flat(Infinity)
	}
}
module.exports.mapService = mapService

const mapOption = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case MethodDescriptorProto:
		case FieldDescriptorProto:
		case DescriptorProto:
		case FileDescriptorProto:
			return Object.entries(Object.entries(context.getOptions())).map(
				([index, [key, value]]) => callback(value, index, arr, key)
			)
		default:
			return mapFile(context, options, fileDesc => {
				return mapOption(fileDesc, options, applyAsParentContext(fileDesc, options, callback))
			})
	}
}
module.exports.mapOption = mapOption

const mapField = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getFieldList().map(callback)
		case FileDescriptorProto:
			return context.getMessageTypeList().map(message => {
				return mapField(message, options, applyAsParentContext(message, options, callback))
			})
		default:
			return mapFile(context, options, fileDesc => {
				return mapField(fileDesc, options, applyAsParentContext(fileDesc, options, callback))
			})
	}
}
module.exports.mapField = mapField

const mapExtension = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
		case FileDescriptorProto:
			return context.getExtensionList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapExtension(fileDesc, options, callback)
			}).flat(Infinity)
	}
}
module.exports.mapExtension = mapExtension

const mapRPC = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case ServiceDescriptorProto:
			return context.getMethodList().map(callback)
		case FileDescriptorProto:
			return context.getServiceList().map(service => {
				return mapRPC(service, options, applyAsParentContext(service, options, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, options, fileDesc => {
				return mapRPC(fileDesc, options, callback)
			}).flat(Infinity)
	}
}
module.exports.mapRPC = mapRPC

const applyAsParentContext = (context, options, callback) => (object, index, array, key) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest.name:
			if (context !== options.data.root) {
				return callback(object, index, array, key)
			}
		default:
			const clone = object.clone()
			clone.setName((context.getPackage || context.getName)() + '.' + object.getName())
			return clone
	}
}
module.exports.applyAsParentContext = applyAsParentContext

const applyDataVariables = options => (value, index, array, key) => {
	if (options.fn) {
		return options.fn(value, {
			data: {
				...options.data,
				key,
				index,
				first: index === 0,
				last: index === array.length - 1,
			}
		})
	}
	return value
}
module.exports.applyDataVariables = applyDataVariables

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		const list = mapDependency(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list
		}
		return list
	})
	handlebars.registerHelper('file', function (options) {
		const list = mapFile(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('package', function (options) {
		const list = mapPackage(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => mapFile(_, options, _ => _.getPackage())).flat(Infinity)
		}
		return list
	})
	handlebars.registerHelper('enum', function (options) {
		const list = mapEnum(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('message', function (options) {
		const list = mapMessage(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('field', function (options) {
		const list = mapField(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('type', function (options) {
		// const list = mapType(this. options, applyDataVariables(options))
		// if (!options.fn) {
		// return list.map(_ => _.getName())
		// }
		// return list
	})
	handlebars.registerHelper('option', function (options) {
		const list = mapOption(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('service', function (options) {
		const list = mapService(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('rpc', function (options) {
		const list = mapRPC(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('scalar', function (options) {
		// const list = mapScalar(this, options, applyDataVariables(options))
		// if (!options.fn) {
		// return list.map(_ => _.getName())
		// }
		// return list
	})
	handlebars.registerHelper('extension', function (options) {
		const list = mapExtension(this, options, applyDataVariables(options))
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
}
