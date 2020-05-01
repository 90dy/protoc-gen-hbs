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
		case ServiceDescriptorProto:
		case MethodDescriptorProto:
			return Object.entries(context.getOptions().toObject())
				.map(([name, value], index, array) => {
					return (
						!options.hash.name || options.hash.name === name
					) && (
						!options.hash.value || options.hash.value === value
					)
						? callback(value, index, array)
						: undefined
				})
		default:
			return mapFile(context, options, fileDesc => {
				return mapOption(fileDesc, options, applyAsParentContext(context, fileDesc, options, callback))
			})
	}
}
module.exports.mapOption = mapOption

const mapFieldMatrix = {
	label: {
		[FieldDescriptorProto.Label.LABEL_OPTIONAL]: 'optional',
		[FieldDescriptorProto.Label.LABEL_REQUIRED]: 'required',
		[FieldDescriptorProto.Label.LABEL_REPEATED]: 'repeated',
	},
	type: {
		[FieldDescriptorProto.Type.TYPE_DOUBLE]: 'double',
		[FieldDescriptorProto.Type.TYPE_FLOAT]: 'float',
		[FieldDescriptorProto.Type.TYPE_INT64]: 'int64',
		[FieldDescriptorProto.Type.TYPE_UINT64]: 'uint64',
		[FieldDescriptorProto.Type.TYPE_INT32]: 'int32',
		[FieldDescriptorProto.Type.TYPE_FIXED64]: 'fixed64',
		[FieldDescriptorProto.Type.TYPE_FIXED32]: 'fixed32',
		[FieldDescriptorProto.Type.TYPE_BOOL]: 'bool',
		[FieldDescriptorProto.Type.TYPE_STRING]: 'string',
		[FieldDescriptorProto.Type.TYPE_GROUP]: 'group',
		[FieldDescriptorProto.Type.TYPE_MESSAGE]: 'message',
		[FieldDescriptorProto.Type.TYPE_BYTES]: 'bytes',
		[FieldDescriptorProto.Type.TYPE_UINT32]: 'uint32',
		[FieldDescriptorProto.Type.TYPE_ENUM]: 'enum',
		[FieldDescriptorProto.Type.TYPE_SFIXED32]: 'sfixed32',
		[FieldDescriptorProto.Type.TYPE_SFIXED64]: 'sfixed64',
		[FieldDescriptorProto.Type.TYPE_SINT32]: 'sint32',
		[FieldDescriptorProto.Type.TYPE_SINT64]: 'sint64',

	}
}
const mapField = (context, options, callback) => {
	switch (Object.getPrototypeOf(context).constructor) {
		case DescriptorProto:
			return context.getFieldList().map((fieldDesc, index, array) => {
				return (
					!options.hash.label || options.hash.label === mapFieldMatrix.label[fieldDesc.getLabel()]
				) && (
					!options.hash.type || options.hash.type === mapFieldMatric.type[fieldDesc.getType()]
				)
					? callback(fieldDesc, index, array)
					: undefined
			})
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

const applyHandlebarsIterator = (options) => (context, index, array, key) => {
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
					applyHandlebarsIterator(options)
				).join('')
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
			data.field = {
				name: data.name
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
module.exports.applyHandlebarsIterator = applyHandlebarsIterator

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		const list = mapDependency(this, options, _ => _)
		if (!options.fn) {
			return list
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('file', function (options) {
		const list = mapFile(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
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
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('enum', function (options) {
		const list = mapEnum(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('value', function (options) {
		const list = mapValue(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('message', function (options) {
		const list = mapMessage(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('field', function (options) {
		const list = mapField(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('oneof', function (options) {
		const list = mapOneOf(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list
	})
	handlebars.registerHelper('option', function (options) {
		const list = mapOption(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('service', function (options) {
		const list = mapService(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('rpc', function (options) {
		const list = mapRPC(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
	handlebars.registerHelper('extension', function (options) {
		const list = mapExtension(this, options, _ => _)
		if (!options.fn) {
			return list.map(_ => _.getName())
		}
		return list.map(applyHandlebarsIterator(options)).join('')
	})
}
