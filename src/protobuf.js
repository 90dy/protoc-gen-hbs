const glob = require('glob')
const {CodeGeneratorRequest} = require('google-protobuf/google/protobuf/compiler/plugin_pb')
const {
	FileDescriptorProto,
	DescriptorProto,
	EnumDescriptorProto,
	EnumValueDescriptorProto,
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
	}).filter(_ => _).map(callback)
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

const mapValue = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case EnumDescriptorProto:
			return context.getValueList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapValue(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
			}).flat(Infinity)
	}
}

const mapOneOf = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getOneofDeclList().map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapOneOf(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
			})
	}
}
module.exports.mapOption = mapOneOf

const mapOption = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case FileDescriptorProto:
		case DescriptorProto:
		case FieldDescriptorProto:
		case EnumValueDescriptorProto:
		case EnumValueDescriptorProto:
		case OneofDescriptorProto:
			// case ServiceDescriptorProto:
		case MethodDescriptorProto:
			return Object.entries(context.getOptions().toObject()).filter(([name, value]) => {
				return (
					!options.hash.name || options.hash.name === name
				) && (
					!options.hash.value || options.hash.value === value
				)
			}).map(callback)
		default:
			return mapFile(context, options, fileDesc => {
				return mapOption(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
			}).flat(Infinity)
	}
}
module.exports.mapOption = mapOption

const mapLabel = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case FieldDescriptorProto:
			switch (context.getLabel()) {
				case FieldDescriptorProto.Label.LABEL_OPTIONAL:
					return 'optional'
				case FieldDescriptorProto.Label.LABEL_REQUIRED:
					return 'required'
				case FieldDescriptorProto.Label.LABEL_REPEATED:
					return 'repeated'
				default:
					return ''
			}
		case DescriptorProto:
			return mapField(context, options, fieldDesc => {
				return mapLabel(fieldDesc, options, applyAsParentContext(context, null, options, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, options, fileDesc => {
				return mapMessage(context, options, messageDesc => {
					return mapLabel(messageDesc, options, applyAsParentContext(context, fileDesc, options, callback))
				}).flat(Infinity)
			}).flat(Infinity)
	}
}
module.exports.mapLabel = mapLabel

const mapType = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case FieldDescriptorProto:
			switch (context.getType()) {
				case FieldDescriptorProto.Type.TYPE_DOUBLE:
					return 'double'
				case FieldDescriptorProto.Type.TYPE_FLOAT:
					return 'float'
				case FieldDescriptorProto.Type.TYPE_INT64:
					return 'int64'
				case FieldDescriptorProto.Type.TYPE_UINT64:
					return 'uint64'
				case FieldDescriptorProto.Type.TYPE_INT32:
					return 'int32'
				case FieldDescriptorProto.Type.TYPE_FIXED64:
					return 'fixed64'
				case FieldDescriptorProto.Type.TYPE_FIXED32:
					return 'fixed32'
				case FieldDescriptorProto.Type.TYPE_BOOL:
					return 'bool'
				case FieldDescriptorProto.Type.TYPE_STRING:
					return 'string'
				case FieldDescriptorProto.Type.TYPE_GROUP:
					return 'group'
				case FieldDescriptorProto.Type.TYPE_MESSAGE:
					return 'message'
				case FieldDescriptorProto.Type.TYPE_BYTES:
					return 'bytes'
				case FieldDescriptorProto.Type.TYPE_UINT32:
					return 'uint32'
				case FieldDescriptorProto.Type.TYPE_ENUM:
					return 'enum'
				case FieldDescriptorProto.Type.TYPE_SFIXED32:
					return 'sfixed32'
				case FieldDescriptorProto.Type.TYPE_SFIXED64:
					return 'sfixed64'
				case FieldDescriptorProto.Type.TYPE_SINT32:
					return 'sint32'
				case FieldDescriptorProto.Type.TYPE_SINT64:
					return 'sint64'
				default:
					return ''
			}
		case DescriptorProto:
			return mapField(context, options, fieldDesc => {
				return mapType(fieldDesc, options, applyAsParentContext(context, null, options, callback))
			}).flatten(Infinity)
		default:
			return mapFile(context, options, fileDesc => {
				return mapMessage(context, options, messageDesc => {
					return mapType(messageDesc, options, applyAsParentContext(context, fileDesc, options, callback))
				}).flatten(Infinity)
			}).flatten(Infinity)
	}
}
module.exports.mapType = mapType

const mapField = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getFieldList().filter(fieldDesc => {
				return (
					mapLabel(fieldDesc, label => !options.hash.label || options.hash.label === label)
				) && (
					mapType(fieldDesc, type => !options.hash.type || options.hash.type === type)
				)
			}).map(callback)
		case FileDescriptorProto:
			return context.getMessageTypeList().map(message => {
				return mapField(message, options, applyAsParentContext(message, context, options, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, options, fileDesc => {
				return mapField(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
			}).flat(Infinity)
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

const applyAsParentContext = (context, fileDesc, options, callback) => (value, index, array, key) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			if (context !== options.data.root) {
				// context === package
				return callback(value, index, array, key)
			} else {
				// context === root
				return applyAsParentContext(
					fileDesc,
					fileDesc,
					options,
					callback
				)(value, index, array, key)
			}
		default:
			const prefix = context.getPackage
				? context.getPackage()
				: context.getName()
			if (typeof value === 'object') {
				const clone = value.clone()
				clone.setName(prefix + '.' + value.getName())
				return callback(clone, index, array, key)
			}
			if (typeof value === 'string') {
				return prefix + '.' + value
			}
			return value
	}
}
module.exports.applyAsParentContext = applyAsParentContext

const applyOptionsIterator = (options) => (context, index, array, key) => {
	let data = {
		...options.data,
		key,
		index,
		first: index === 0,
		last: index === array.length - 1
	}
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			if (context !== options.data.root) {
				// package
				data.name = context.getProtoFileList()[0].getPackage()
				data.package = {
					name: data.name
				}
			}
			break
		case FileDescriptorProto:
			data.name = context.getName()
			data.file = {
				name: data.name
			}
			break
		case DescriptorProto:
			data.name = context.getName()
			data.recursive = () => {
				const recursiveOptions = { ...options, _parent: data, data: {} }
				return mapMessage(
					context,
					recursiveOptions,
					applyOptionsIterator(options)
				).join('\n')
			}
			data.message = {
				name: data.name,
				recursive: data.recursive,
			}
			break
		case EnumDescriptorProto:
			data.name = context.getName()
			data.enum = {
				name: data.name
			}
			break
		case EnumValueDescriptorProto:
			data.name = context.getName()
			data.number = context.getNumber()
			data.value = {
				name: data.name,
				number: data.number,
			}
		case FieldDescriptorProto:
			data.name = context.getName()
			data.type = mapType(context, _ => _)
			data.field = {
				name: data.name,
				type: data.type,
			}
			break
		case OneofDescriptorProto:
			data.name = context.getName()
			data.oneof = {
				name: data.name
			}
			break
		case ServiceDescriptorProto:
			data.name = context.getName()
			data.service = {
				name: data.name
			}
			break
		case MethodDescriptorProto:
			data.name = context.getName()
			data.method = {
				name: data.name
			}
			break
		default:
			break
	}
	return options.fn(context, { data })
}
module.exports.applyOptionsIterator = applyOptionsIterator

const applyOptions = (context, options) => {
	if (typeof context !== 'object') {
		return !options.fn
			? _ => _
			: applyOptionsIterator(options)
	}
	switch (Object.getPrototypeOf(context).constructor) {
		case CodeGeneratorRequest:
			if (context !== options.data.root) {
				// context === package
				return !options.fn
					? _ => {
						const file = _.getProtoFileList()[0]
						return file
							? file.getPackage()
							: ''
					} : applyOptionsIterator(options)
			}
		default:
			return !options.fn
				? _ => _.getName()
				: applyOptionsIterator(options)
	}
}

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		return mapDependency(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('file', function (options) {
		return mapFile(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('package', function (options) {
		return mapPackage(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('enum', function (options) {
		return mapEnum(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('value', function (options) {
		return mapValue(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('message', function (options) {
		return mapMessage(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('field', function (options) {
		return mapField(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('oneof', function (options) {
		return mapOneOf(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('option', function (options) {
		return mapOption(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('service', function (options) {
		return mapService(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('rpc', function (options) {
		return mapRPC(this, options, applyOptions(this, options)).join('\n')
	})
	handlebars.registerHelper('extension', function (options) {
		return mapExtension(this, options, applyOptions(this, options)).join('\n')
	})
}

