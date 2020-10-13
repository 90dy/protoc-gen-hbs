const minimatch = require('minimatch')
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
	FileOptions,
	MessageOptions,
	FieldOptions,
	OneofOptions,
	EnumOptions,
	EnumValueOptions,
	ServiceOptions,
	MethodOptions,
	ExtensionRangeOptions,
} = require('google-protobuf/google/protobuf/descriptor_pb')
const mem = require('mem')

const returnValue = _ => _
const returnNothing = () => undefined
const log = (callback = returnValue) => (item, args) => console.error(item) || callback(item, ...args)

const getPackageList = mem((root) => {
	const packageList = {}
	mapFile(
		{ descriptor: root, options: { hash: {}, data: {} } },
		({ descriptor: globalFileDesc }) => {
			const _ = globalFileDesc.getPackage()
			const fileDesc = globalFileDesc.clone()
			if (!packageList[_]) {
				packageList[_] = root.clone()
				packageList[_].setProtoFileList([fileDesc])
				packageList[_].setFileToGenerateList([fileDesc.getName()])
				return packageList[_]
			}
			packageList[_].addFileToGenerate(fileDesc.getName())
			packageList[_].addProtoFile(fileDesc)
		}
	)
	Object.keys(packageList).
		forEach(name =>
			(name.split('.') || []).forEach((_, index, array) => {
				const key = array.slice(0, index + 1).join('.')
				if (!packageList[key]) {
					const fakeFile = new FileDescriptorProto()
					fakeFile.setPackage(key)
					packageList[key] = root.clone()
					packageList[key].setProtoFileList([fakeFile])
					packageList[key].setFileToGenerateList([])
				}
			})
		)
	return packageList
})

const mapPackage = (context, callback = returnValue) => {
	const packageList = getPackageList(context.options.data.root)
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case CodeGeneratorRequest:
			if (context.descriptor !== context.options.data.root) {
			  const package = context.descriptor.getProtoFileList()[0].getPackage()
				if (context.options.hash.nested || context.options.hash.recursive) {
					const res = Object.keys(packageList).
						filter(name => minimatch(
							name,
							package + '.!(*.*)',
						)).
						sort().
						map(name => packageList[name]).
						map(applyDescriptor(context, returnValue)).
						map(_ => [_, ...mapPackage(_, returnValue)]).
						flat(Infinity).
						map(applyScope(context, callback))
					return res
				}
				return Object.keys(packageList).
					filter(name => minimatch(name, package + '.!(*.*)')).
					sort().
					map(name => packageList[name]).
					map(applyDescriptor(context, callback))
			}
			if (context.options.hash.nested || context.options.hash.recursive) {
				return Object.keys(packageList).
					filter(name => minimatch(name, '!*.*')).
					sort().
					map(name => packageList[name]).
					map(applyDescriptor(context, callback)).
					map(_ => [_, ...mapPackage(_, callback)]).
					flat(Infinity)
			}
			return Object.keys(packageList).
				filter(name => minimatch(name, '!*.*')).
				sort().
				map(name => packageList[name]).
				map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			if (context.options.hash.nested || context.options.hash.recursive) {
				return [context.descriptor.getPackage()].
					map(name => packageList[name]).
					map(applyDescriptor(context, returnValue)).
					map(_ => [_, ...mapPackage(_, returnValue)]).
					flat(Infinity).
					map(applyScope(context, callback))
			}
			return [context.descriptor.getPackage()].
				map(name => packageList[name]).
				map(applyDescriptor(context, applyScope(context, callback)))
		default:
			return []
	}
}
module.exports.mapPackage = mapPackage

const mapFile = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case CodeGeneratorRequest:
			if (context.options.hash.all) {
				return context.descriptor.getProtoFileList().map(applyDescriptor(context, callback))
			}
			return context.descriptor.getProtoFileList().filter(
				fileDesc => context.descriptor.getFileToGenerateList().find(
					fileName => fileDesc.getName() === fileName
				)
			).map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapFile = mapFile

const mapImport = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FileDescriptorProto:
			return mapFile(context, file => {
				return file.descriptor.getDependencyList().map(applyDescriptor(context, callback))
			}).flat(Infinity)
		case CodeGeneratorRequest:
			if (context.descriptor === context.options.data.root) {
				return mapFile(context, file => applyScope(file, callback)).flat(Infinity)
			}
			return mapFile(context, callback).flat(Infinity)
		default:
			return []
	}
}
module.exports.mapImport = mapImport

const mapMessage = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		// case FieldDescriptorProto:
		// TODO return type
		case DescriptorProto:
			if (context.options.hash.nested || context.options.hash.recursive) {
				return context.descriptor.getNestedTypeList().
					map(applyDescriptor(context, returnValue)).
					map(_ => [_, ...mapMessage(_, returnValue)]).
					flat(Infinity).
					map(applyScope(context, callback))
			}
			return context.descriptor.getNestedTypeList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			if (context.options.hash.nested || context.options.hash.recursive) {
				return context.descriptor.getMessageTypeList().
					map(applyDescriptor(context, returnValue)).
					map(_ => [_, ...mapMessage(_, callback)]).
					flat(Infinity)
			}
			return context.descriptor.getMessageTypeList().map(applyDescriptor(context, callback))
		case CodeGeneratorRequest:
			if (context.descriptor === context.options.data.root) {
				return mapFile(context, file => {
					return mapMessage(file, applyScope(file, callback))
				}).flat(Infinity)
			}
			return mapFile(context, file => {
				return mapMessage(file, callback)
			}).flat(Infinity)
		default:
			return []
	}
}
module.exports.mapMessage = mapMessage

const mapEnum = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case DescriptorProto:
			return context.descriptor.getEnumTypeList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return context.descriptor.getEnumTypeList().map(applyDescriptor(context, callback))
		case CodeGeneratorRequest:
			if (context.descriptor === context.options.data.root) {
				return mapFile(context, file => {
					return mapEnum(file, applyScope(file, callback))
				}).flat(Infinity)
			}
			return mapFile(context, file => {
				return mapEnum(file, callback)
			}).flat(Infinity)
		default:
			return []
	}
}
module.exports.mapEnum = mapEnum

const mapValue = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case EnumDescriptorProto:
			return context.descriptor.getValueList().map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapValue = mapValue

const mapOneOf = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case DescriptorProto:
			return context.descriptor.getOneofDeclList().map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapOneOf = mapOneOf

const mapOption = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case CodeGeneratorRequest:
			return context.descriptor.getProtoFileList().
				map(file => mapOption(file, applyScope(file, callback))).
				flat(Infinity)
		case FileDescriptorProto:
		case DescriptorProto:
		case FieldDescriptorProto:
		case EnumValueDescriptorProto:
		case OneofDescriptorProto:
		case ServiceDescriptorProto:
		case MethodDescriptorProto:
			return [context.descriptor.getOptions()].
				filter(_ => _).
				map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapOption = mapOption

const mapLabel = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FieldDescriptorProto:
			switch (context.descriptor.getLabel()) {
				case FieldDescriptorProto.Label.LABEL_OPTIONAL:
					return 'optional'
				case FieldDescriptorProto.Label.LABEL_REQUIRED:
					return 'required'
				case FieldDescriptorProto.Label.LABEL_REPEATED:
					return 'repeated'
				default:
					return ''
			}
		default:
			return ''
	}
}
module.exports.mapLabel = mapLabel

const mapType = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FieldDescriptorProto:
			switch (context.descriptor.getType()) {
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
		default:
			return ''
	}
}
module.exports.mapType = mapType

const mapField = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case DescriptorProto:
			return context.descriptor.getFieldList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return []
	}
}
module.exports.mapField = mapField

const mapExtension = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case DescriptorProto:
			return context.descriptor.getExtensionList().map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapExtension = mapExtension

const mapService = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case ServiceDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return context.descriptor.getServiceList().map(applyDescriptor(context, callback))
		case CodeGeneratorRequest:
			if (context.descriptor === context.options.data.root) {
				return mapFile(context, file => {
					return mapService(file, applyScope(file, callback))
				}).flat(Infinity)
			}
			return mapFile(context, file => {
				return mapService(file, callback)
			}).flat(Infinity)
		default:
			return []
	}
}
module.exports.mapService = mapService

const mapRPC = (context, callback = returnValue) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case MethodDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case ServiceDescriptorProto:
			return context.descriptor.getMethodList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return mapService(service => {
				return mapRPC(service, applyScope(service, callback))
			}).flat(Infinity)
		default:
			return []
	}
}
module.exports.mapRPC = mapRPC

const applyScope = ({descriptor, options}, callback = returnValue) => {
	let scope = ''
	switch (Object.getPrototypeOf(descriptor).constructor) {
		case CodeGeneratorRequest:
			if (descriptor === options.data.root) {
				return callback
			}
			scope = options.data.name
			break
		case FileDescriptorProto:
			scope = options.name === 'package'
				? descriptor.getPackage().split('.').slice(0, -1).join('.')
				: descriptor.getPackage()
			break
		default:
			scope = options.data.name
			break
	}
	return (item, ...args) => {
		const name = scope ? scope + '.' + item.options.data.name : item.options.data.name
		return callback({
			...item,
			options: {
				...item.options,
				data: {
					...item.options.data,
					name,
				},
			},
		}, ...args)
	}
}
module.exports.applyScope = applyScope

const applyIteration = (callback = returnValue) => (item, index, array) => {
	return callback({
		...item,
		options: {
			...item.options,
			data: {
				...item.options.data,
				index: index === 0,
				first: index === 0,
				last: index === array.length - 1,
			}
		}
	}, index, array)
}
module.exports.applyIteration = applyIteration

const applyDescriptor = (context, callback = returnValue) => {
	const {options} = context
	const itemOpts = {
		hash: {
			...options.hash,
			nested: false,
		},
		data: {
			root: options.data.root,
			...Object.keys(options.data).reduce((a, k) =>
				[
					'package',
					'file',
					'import',
					'message',
					'field',
					'enum',
					'value',
					'oneof',
					'service',
					'rpc'
				].some(_ => _ === k)
					? { ...a, [k]: options.data[k] }
					: a,
				{}
			),
		}
	}
	return (itemDesc, ...args) => {
		const item = {
			descriptor: itemDesc,
			options: itemOpts,
		}
		let {data} = item.options
		switch (Object.getPrototypeOf(item.descriptor).constructor) {
			case CodeGeneratorRequest:
				if (item.descriptor !== options.data.root) {
					data.package = {
						name: item.descriptor.getProtoFileList()[0].getPackage().split('.').slice(-1)[0],
						recursive (options) {
              return handleHelper({
                ...context.options,
								...options,
								name: 'package',
								_parent: data,
              })
						}
					}
					data = { ...data, ...data.package }
				}
				break
			case FileDescriptorProto:
				data.file = {
					name: item.descriptor.getName().replace(/.proto$/, ''),
				}
				data = { ...data, ...data.file }
				break
			case DescriptorProto:
				data.message = {
					name: item.descriptor.getName(),
					recursive (options) {
						return handleHelper({
							...context.options,
							...options,
							name: 'message',
							_parent: data,
						})
					}
				}
				data = { ...data, ...data.message }
				break
			case EnumDescriptorProto:
				data.enum = {
					name: item.descriptor.getName(),
				}
				data = { ...data, ...data.enum }
				break
			case EnumValueDescriptorProto:
				data.value = {
					name: item.descriptor.getName(),
					number: item.descriptor.getNumber(),
				}
				data = { ...data, ...data.value }
				break
			case FieldDescriptorProto:
				data.field = {
					name: item.descriptor.getName(),
					type: mapType(item, returnValue),
					label: mapLabel(item, returnValue),
					number: item.descriptor.getNumber(),
				}
				data = { ...data, ...data.field }
				break
			case OneofDescriptorProto:
				data.oneof = {
					name: item.descriptor.getName(),
				}
				data = { ...data, ...data.oneof }
				break
			case ServiceDescriptorProto:
				data.service = {
					name: item.descriptor.getName(),
				}
				data = { ...data, ...data.service }
				break
			case MethodDescriptorProto:
				data.rpc = {
					name: item.descriptor.getName(),
					input: item.descriptor.getInputType().replace(/^\./, ''),
					output: item.descriptor.getOutputType().replace(/^\./, ''),
					client: item.descriptor.getClientStreaming() ? 'stream' : 'unary',
					server: item.descriptor.getServerStreaming() ? 'stream' : 'unary',
				}
				data = { ...data, ...data.rpc }
				break
			case FileOptions:
			case MessageOptions:
			case FieldOptions:
			case OneofOptions:
			case EnumOptions:
			case EnumValueOptions:
			case ServiceOptions:
			case MethodOptions:
			case ExtensionRangeOptions:
				data.option = { ...data, ...item.descriptor.toObject() }
				data = { ...data, ...data.option }
				break
			default:
				break
		}
		return callback({
			...item,
			options: {
				...item.options,
				data: {
					...data,
				}
			}
		}, ...args)
	}
}
module.exports.applyDescriptor = applyDescriptor

const matchIterationHash = (context, ok = returnValue, or = returnNothing) => (item, ...args) => {
  if (Object.entries(context.options.hash).every(([key, value]) => {
    switch (key) {
      case 'index':
      case 'first':
      case 'last':
      case 'number':
        return item.options.data[key] === value
      default:
        return true
    }
  })) {
    return ok(item, ...args)
  } else {
    return or(item, ...args)
  }
}
module.exports.matchIterationHash = matchIterationHash

const matchProtobufHash = (context, ok = returnValue, or = returnNothing) => (item, ...args) => {
	if (Object.entries(context.options.hash).every(([key, value]) => {
		switch (key) {
			case 'all':
				return true
			case 'nested':
				return true
			case 'recursive':
				return true
			case 'type':
			case 'label':
			case 'intput':
			case 'output':
			case 'client':
			case 'server':
			case 'name':
				return minimatch(item.options.data[key], value)
			case 'number':
				return item.options.data[key] === value
			default:
				return true
		}
	})) {
		return ok(item, ...args)
	} else {
		return or(item, ...args)
	}
}
module.exports.matchProtobufHash = matchProtobufHash

const getOptionsDataScopeAndName = (descName) => {
	return (descName.match(/(.*)\.(.*)/) || ['', '', descName]).
		slice(1, 3).
		reduce((a, v, i) => ({
			...a,
			[i === 0 ? 'scope' : 'name']: v
		}), {})
}


const ifInverse = (context) => {
	if (!context.options.fn) {
		return () => false
	}
	if (!context.options.inverse) {
		return (item) => !item.options.data.inverse
	}
	return (item) => true
}

const applyInverse = (context, callback = returnValue) => {
	return matchProtobufHash(
		context,
		callback,
		(item, ...args) => callback({
			...item,
			options: {
				...item.options,
				data: {
					...item.options.data,
					inverse: true
				}
			}
		}, ...args)
	)
}

const applyResult = (context) => {
	return context.options.fn
		? context.options.inverse
			? ({ descriptor, options }) => options.data.inverse ? context.options.inverse(descriptor, options) : context.options.fn(descriptor, options)
			: ({ descriptor, options }) => options.data.inverse ? '' : context.options.fn(descriptor, options)
		: ({ descriptor, options }) => options.data.inverse ? '' : options.data.name
}

const applyDescriptorParent = (context, callback = returnValue) => (item, ...args) => callback({
	...item,
	options: {
		...item.options,
		data: {
			...item.options.data,
			[context.options.name]: item.options.data,
		}
	}
}, ...args)

const mapDescriptor = (context, callback = returnValue) => {
	const {options} = context
	switch (options.name) {
		case 'package':
			return mapPackage(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'file':
			return mapFile(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'import':
			return mapImport(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'enum':
			return mapEnum(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'value':
			return mapValue(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'message':
			return mapMessage(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'field':
			return mapField(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'oneof':
			return mapOneOf(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'option':
			return mapOption(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'service':
			return mapService(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'rpc':
			return mapRPC(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		case 'extension':
			return mapExtension(context, applyInverse(context, applyDescriptorParent(context))).filter(ifInverse(context)).map(callback)
		default:
			return []
	}
}

function handleHelper (options) {
  const context = { descriptor: this, options }
  return mapDescriptor(context).map(applyIteration(matchIterationHash(context))).filter(returnValue).map(applyResult(context)).join('')
}

module.exports.register = handlebars => {
	handlebars.registerHelper('import', handleHelper)
	handlebars.registerHelper('file', handleHelper)
	handlebars.registerHelper('package', handleHelper)
	handlebars.registerHelper('enum', handleHelper)
	handlebars.registerHelper('value', handleHelper)
	handlebars.registerHelper('message', handleHelper)
	handlebars.registerHelper('field', handleHelper)
	handlebars.registerHelper('oneof', handleHelper)
	handlebars.registerHelper('option', handleHelper)
	handlebars.registerHelper('service', handleHelper)
	handlebars.registerHelper('rpc', handleHelper)
	handlebars.registerHelper('extension', handleHelper)
}
