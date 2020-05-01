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
			packageList[fileDesc.package].setProtoFileList([fileDesc])
			packageList[fileDesc.package].setFileToGenerateList([fileDesc.getName()])
			return packageList[fileDesc.package]
		}
		packageList[fileDesc.package].addFileToGenerate(fileDesc.getName())
		packageList[fileDesc.package].addProtoFile(fileDesc)
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
				return mapMessage(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
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
				return mapEnum(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
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
				return mapService(fileDesc, options, applyAsParentContext(context,  fileDesc, options, callback))
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
				return mapOption(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
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
				return mapField(message, options, applyAsParentContext(message, context, options, callback))
			})
		default:
			return mapFile(context, options, fileDesc => {
				return mapField(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
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
				return mapRPC(service, options, applyAsParentContext(service, context, options, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, options, fileDesc => {
				return mapRPC(fileDesc, options, callback)
			}).flat(Infinity)
	}
}
module.exports.mapRPC = mapRPC

const applyAsParentContext = (context, fileDesc, options, callback) => (object, index, array, key) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			if (context !== options.data.root) {
				// context === package
				return callback(object, index, array, key)
			} else {
				// context === root
				return applyAsParentContext(
					fileDesc,
					fileDesc,
					options,
					callback
				)(object, index, array, key)
			}
		default:
			const clone = object.clone()
			const prefix = context.getPackage
				? context.getPackage()
				: context.getName()
			clone.setName(prefix + '.' + object.getName())
			return callback(clone, index, array, key)
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
				...value.toObject(),
			}
		})
	}
	return value
}
module.exports.applyDataVariables = applyDataVariables

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		const list = mapDependency(this, options, _ => _)
		if (!options.fn) {
			return list
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('file', function (options) {
		const list = mapFile(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('package', function (options) {
		const list = mapPackage(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => {
				const file = _.getProtoFileList()[0]
				return file
				  ? file.getName()
					: ''
			}).flat(Infinity)
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('enum', function (options) {
		const list = mapEnum(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('message', function (options) {
		const list = mapMessage(this, options, _ => _)
		console.error(list.map(_ => _)[0])
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('field', function (options) {
		const list = mapField(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('type', function (options) {
		// const list = mapType(this. options, _ => _)
		// if (!options.fn) {
		// return list.map(_ => _.getName())
		// }
		// return list
	})
	handlebars.registerHelper('option', function (options) {
		const list = mapOption(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('service', function (options) {
		const list = mapService(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('rpc', function (options) {
		const list = mapRPC(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
	handlebars.registerHelper('scalar', function (options) {
		// const list = mapScalar(this, options, _ => _)
		// if (!options.fn) {
		// return list.map(_ => _.getName())
		// }
		// return list
	})
	handlebars.registerHelper('extension', function (options) {
		const list = mapExtension(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyDataVariables(options))
	})
}
