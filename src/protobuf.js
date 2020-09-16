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

const returnValue = _ => _

const mapFile = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case CodeGeneratorRequest:
			if (context.options.hash === 'all') {
				return context.descriptor.getProtoFileList().map(applyDescriptor(context, callback))
			}
			return context.descriptor.getProtoFileList().filter(
				fileDesc => context.descriptor.getFileToGenerateList().find(
					fileName => fileDesc.getName() === fileName
				)
			).map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapFile = mapFile

const mapImport = (context, callback) => {
	return mapFile(context, file => {
		return file.descriptor.getDependencyList().map(applyDescriptor(context, callback))
	}).flat(Infinity)
}
module.exports.mapImport = mapImport

const mapPackage = (context, callback) => {
	const packageList = {}
	return mapFile(context, ({ descriptor: fileDesc }) => {
		const package = fileDesc.getPackage()
		if (!packageList[package]) {
			packageList[package] = context.options.data.root.clone()
			packageList[package].setProtoFileList([fileDesc])
			packageList[package].setFileToGenerateList([fileDesc.getName()])
			return packageList[package]
		}
		packageList[package].addFileToGenerate(fileDesc.getName())
		packageList[package].addProtoFile(fileDesc)
	}).filter(_ => _).map(applyDescriptor(context, callback))
}
module.exports.mapPackage = mapPackage

const mapMessage = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		// TODO: get message from field type
		// case FieldDescriptorProto:
		//	return mapType(context, type => {
		//		if (type === 'message') {
		//			return [].map(callback)
		//		}
		//	}).flat(Infinity).filter(_ => _)
		case DescriptorProto:
			if (context.options.hash.nested) {
				return context.descriptor.getNestedTypeList().map(applyDescriptor(context, callback))
			}
			if (context.options.hash.recursive) {
				return context.descriptor.getNestedTypeList().map(applyDescriptor(context, message => [
					message,
					mapMessage(message, applyScope(message, null, returnValue))
				])).flat(Infinity).map(callback)
			}
			return [context.descriptor].map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			if (context.options.hash.nested || context.options.hash.recursive) {
				return context.descriptor.getMessageTypeList().map(applyDescriptor(context, message => [
					message,
					mapMessage(message, applyScope(message, null, returnValue))
				])).flat(Infinity).map(callback)
			}
			return context.descriptor.getMessageTypeList().map(applyDescriptor(context, callback))
		default:
			return mapFile(context, file => {
				return mapMessage(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}
module.exports.mapMessage = mapMessage

const mapNested = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case DescriptorProto:
			return context.descriptor.getNestedTypeList().map(applyDescriptor(context, callback))
		default:
			return []
	}
}
module.exports.mapNested = mapNested

const mapEnum = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case EnumDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case DescriptorProto:
			return context.descriptor.getEnumTypeList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return context.descriptor.getEnumTypeList().map(applyDescriptor(context, callback))
		default:
			return mapFile(context, file => {
				return mapEnum(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}
module.exports.mapEnum = mapEnum

const mapValue = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case EnumValueDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case EnumDescriptorProto:
			return context.descriptor.getValueList().map(callback)
		default:
			return mapFile(context, file => {
				return mapValue(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}

const mapOneOf = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case OneofDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case DescriptorProto:
			return context.descriptor.getOneofDeclList().map(applyDescriptor(context, callback))
		default:
			return mapFile(context, file => {
				return mapOneOf(file, applyScope(context, file.descriptor, callback))
			})
	}
}
module.exports.mapOneOf = mapOneOf

const mapOption = (context, callback) => {
	if (!context.descriptor) {
		return []
	}
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FileOptions:
		case MessageOptions:
		case FieldOptions:
		case OneofOptions:
		case EnumOptions:
		case EnumValueOptions:
		case ServiceOptions:
		case MethodOptions:
		case ExtensionRangeOptions:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case FileDescriptorProto:
		case DescriptorProto:
		case FieldDescriptorProto:
		case EnumValueDescriptorProto:
		case OneofDescriptorProto:
		case ServiceDescriptorProto:
		case MethodDescriptorProto:
			return mapOption({...context, descriptor: context.descriptor.getOptions()}, callback)
		default:
			return mapFile(context, file => {
				return mapOption(file, callback)
			}).flat(Infinity)
	}
}
module.exports.mapOption = mapOption

const mapLabel = (context, callback) => {
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
		case DescriptorProto:
			return mapField(context, field => {
				return mapLabel(field, applyScope(context, null, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, file => {
				return mapMessage(context, message => {
					return mapLabel(message, applyScope(context, file.descriptor, callback))
				}).flat(Infinity)
			}).flat(Infinity)
	}
}
module.exports.mapLabel = mapLabel

const mapType = (context, callback) => {
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
		case DescriptorProto:
			return mapField(context, field => {
				return mapType(field, applyScope(context, null, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, file => {
				return mapMessage(context, message => {
					return mapType(message, applyScope(context, file.descriptor, callback))
				})
			}).flat(Infinity)
	}
}
module.exports.mapType = mapType

const mapField = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FieldDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case DescriptorProto:
			return context.descriptor.getFieldList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return mapMessage(message => {
				return mapField(message, applyScope(message, context.descriptor, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, file => {
				return mapField(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}
module.exports.mapField = mapField

const mapExtension = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case FieldDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case DescriptorProto:
			return context.descriptor.getExtensionList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return mapMessage(message => {
				return mapExtension(message, applyScope(message, context.descriptor, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, file => {
				return mapExtension(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}
module.exports.mapExtension = mapExtension

const mapService = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case ServiceDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return context.descriptor.getServiceList().map(applyDescriptor(context, callback))
		default:
			return mapFile(context, file => {
				return mapService(file, applyScope(context, file.descriptor, callback))
			}).flat(Infinity)
	}
}
module.exports.mapService = mapService

const mapRPC = (context, callback) => {
	switch (Object.getPrototypeOf(context.descriptor).constructor) {
		case MethodDescriptorProto:
			return [context.descriptor].map(applyDescriptor(context, callback))
		case ServiceDescriptorProto:
			return context.descriptor.getMethodList().map(applyDescriptor(context, callback))
		case FileDescriptorProto:
			return mapService(service => {
				return mapRPC(service, applyScope(service, context.descriptor, callback))
			}).flat(Infinity)
		default:
			return mapFile(context, file => {
				return mapRPC(file, callback)
			}).flat(Infinity)
	}
}
module.exports.mapRPC = mapRPC

const applyScope = ({descriptor, options}, fileDesc, callback) => (item, index, array) => {
	switch (Object.getPrototypeOf(descriptor).constructor) {
		case CodeGeneratorRequest:
			if (descriptor !== options.data.root) {
				// descriptor === package
				return callback(item, index, array)
			} else {
				// descriptor === root
				return applyScope(
					{
						descriptor: fileDesc,
						options,
					},
					fileDesc,
					callback,
				)(item, index, array)
			}
		default: {
			const scope = descriptor.getPackage
				? descriptor.getPackage()
				: descriptor.getName()
			const name = scope + '.' + item.options.data.name
			return callback({
				...item,
				options: {
					...item.options,
					data: {
						...item.options.data,
						name,
						[item.options.name]: {
							...item.options.data[item.options.name],
							name,
						},
					},
				},
			}, index, array)
		}
	}
}
module.exports.applyScope = applyScope

const applyIterator = (callback) => (item, index, array) => {
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
module.exports.applyIterator = applyIterator

const applyDescriptor = (context, callback) => (itemDesc, index, array) => {
	const { options } = context
	const item = {
		descriptor: itemDesc,
		options: {
			...context.options,
		},
	}
	let data = {}
	switch (Object.getPrototypeOf(item.descriptor).constructor) {
		case CodeGeneratorRequest:
			if (item.descriptor !== options.data.root) {
				// package
				data[options.name] = {
					name: item.descriptor.getProtoFileList()[0].getPackage()
				}
				data = { ...data, ...data[options.name] }
			}
			break
		case FileDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName().replace(/.proto$/, ''),
			}
			data = { ...data, ...data[options.name] }
			break
		case DescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
				recursive: () => {
					const recursiveOptions = { ...options, _parent: data, data: {} }
					return mapNested(
						{descriptor: item.descriptor, options: recursiveOptions},
						applyOptions({ descriptor: item.descriptor, options })
					).join('\n')
				},
			}
			data = { ...data, ...data[options.name] }
			break
		case EnumDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
			}
			data = { ...data, ...data[options.name] }
			break
		case EnumValueDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
				number: item.descriptor.getNumber(),
			}
			data = { ...data, ...data[options.name] }
			break
		case FieldDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
				type: mapType(item, returnValue),
				label: mapLabel(item, returnValue),
				number: item.descriptor.getNumber(),
			}
			data = { ...data, ...data[options.name] }
			break
		case OneofDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
			}
			data = { ...data, ...data[options.name] }
			break
		case ServiceDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
			}
			data = { ...data, ...data[options.name] }
			break
		case MethodDescriptorProto:
			data[options.name] = {
				name: item.descriptor.getName(),
				input: item.descriptor.getInputType().replace(/^\./, ''),
				output: item.descriptor.getOutputType().replace(/^\./, ''),
				client: item.descriptor.getClientStreaming() ? 'stream' : 'unary',
				server: item.descriptor.getServerStreaming() ? 'stream' : 'unary',
			}
			data = { ...data, ...data[options.name] }
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
			data.option = item.descriptor.toObject()
			data = { ...data, ...data[options.name] }
			break
		default:
			break
	}
	return callback({
		...item,
		options: {
			...item.options,
			data: {
				...item.options.data,
				...data,
			}
		}
	}, index, array)
}
module.exports.applyDescriptor = applyDescriptor


const matchHash = ({options}, trueMatch, falseMatch) => (item, index, array) => {
	if (Object.entries(options.hash).every(([key, value]) => {
		if (options.hash.diff) {
			switch (key) {
				case 'all':
					return true
        case 'nested':
          return true
				case 'recursive':
					return true
				case 'diff':
					return !minimatch(item.options.data.name, value)
				default:
					break
			}
		}
		switch (typeof value) {
			case 'string':
				return minimatch(item.options.data[key], value)
			default:
				return item.options.data[key] === value
		}
	})) {
		return trueMatch(item, index, array)
	} else if (falseMatch) {
		return falseMatch(item, index, array)
	}
}
module.exports.matchHash = matchHash

const getOptionsDataScopeAndName = (descName) => {
	return (descName.match(/(.*)\.(.*)/) || ['', '', descName]).
		slice(1, 3).
		reduce((a, v, i) => ({
			...a,
			[i === 0 ? 'scope' : 'name']: v
		}), {})
}


const isSame = (a) => (b) => {
	return a.descriptor === b.descriptor
}

const isNotSame = (a) => (b) => {
	return a.descriptor !== b.descriptor
}

const applyOptions = (context) => {
	const {options} = context
	return options.fn
		? applyIterator(matchHash(
			context,
			(context) => options.fn(context.descriptor, context.options),
			(context) => options.inverse(context.descriptor, context.options),
		))
		: applyIterator(matchHash(
			context,
			({ options }) => options.data.name
		))
}

const mapDescriptor = (context, callback) => {
	const {options} = context
	switch (options.name) {
		case 'package':
			return mapPackage(context, callback)
		case 'file':
			return mapFile(context, callback)
		case 'import':
			return mapImport(context, callback)
		case 'enum':
			return mapEnum(context, callback)
		case 'value':
			return mapValue(context, callback)
		case 'message':
			return mapMessage(context, callback)
		case 'nested':
			return mapNested(context, callback)
		case 'field':
			return mapField(context, callback)
		case 'oneof':
			return mapOneOf(context, callback)
		case 'option':
			return mapOption(context, callback)
		case 'service':
			return mapService(context, callback)
		case 'rpc':
			return mapRPC(context, callback)
		case 'extension':
			return mapExtension(context, callback)
		default:
			return []
	}
}

const applyAsOld = (callback) => (item, index, array) => {
	return callback({
		...item,
		options: {
			...item.options,
			data: {
				...item.options.data,
				old: true,
				new: false,
			},
		}
	}, index, array)
}

const applyAsNew = (callback) => (item, index, array) => {
	return callback({
		...item,
		options: {
			...item.options,
			data: {
				...item.options.data,
				new: true,
				old: false,
			},
		},
	}, index, array)
}

const isDiff = (a, diffHash) => (b) => {
  if (diffHash) {
    return true
  }
	if (a.options.data.old !== b.options.data.new) {
		return false
	}
	return Object.keys(a.options.data).every((key) => {
		switch (key) {
			case 'number':
				return a.options.data.number === b.options.data.number
			case 'name':
				return a.options.data.name === b.options.data.name
			default:
				return true
		}
	})
}

const applyDiff = (context, oldItems, newItems, diffHash, callback) => {
  console.error(oldItems.map(_ => _.options.data.name))
	return (item, index, array) => {
    let diffItems = item.options.data.new
			? oldItems.filter(isDiff(item, diffHash))
      : newItems.filter(isDiff(item, diffHash))
		return callback({
			...item,
			options: {
				...item.options,
				data: {
					...item.options.data,
					diffItems,
					created: item.options.data.new ? diffItems.length === 0 : false,
					deleted: item.options.data.old ? diffItems.length === 0 : false,
				}
			}
		}, index, array)
	}
}

// const mapDiff = (context, callback) => {
//   const rootCtx = {
//     descriptor: context.options.data.root,
// 		options: {
//       ...context.options,
// 			hash: {
// 				...context.options.hash,
// 				name: context.options.hash.diff,
// 				all: true,
// 				recursive: true,
// 			}
// 		},
//   }
//   delete rootCtx.options.hash.diff
//   console.error(rootCtx)
// 	return mapDescriptor(rootCtx, matchHash(rootCtx, callback))
// }

const mapDescriptorWithDiff = (context, callback) => {
  const {diffItems} = context.options.data
  const diffHash = context.options.data.diff || context.options.hash.diff

	if (!diffHash && !diffItems) {
		return mapDescriptor(context, callback)
  }

  const _context = {
    ...context,
    options: {
      ...context.options,
      hash: {
        ...context.options.hash
      },
      data: {
        ...context.options.data
      }
    }
  }
  _context.options.hash.diff && delete _context.options.hash.diff
  _context.options.data.diff && delete _context.options.data.diff
  console.error(_context.options.hash.name)

  if (!diffHash && diffItems) {
    const oldItems = diffItems.map(
      diffItem => mapDescriptor({ ...diffItem, options: _context.options }, applyAsOld(returnValue))
    ).flat(Infinity)
    const newItems = mapDescriptor(_context, applyAsNew(returnValue))
    return [newItems, oldItems].flat(Infinity).map(applyDiff(_context, oldItems, newItems, diffHash, callback))
  }

  if (diffHash && !diffItems) {
    console.error(_context.options.data)
    const diffHashContext = {
      ..._context,
      options: {
        ..._context.options,
        hash: {
          ..._context.options.hash,
          name: diffHash,
        }
      }
    }
    const items = mapDescriptor(
      diffHashContext,
      matchHash(diffHashContext, applyAsOld(returnValue), applyAsNew(returnValue))
    )
    const oldItems = items.filter(_ => _.options.data.old)
    const newItems = items.filter(_ => _.options.data.new)
    return items.map(applyDiff(_context, oldItems, newItems, diffHash, callback))
  }

  if (diffHash && diffItems) {
    const oldItems = diffItems.map(
      diffItem => {
        const diffHashContext = {
          ...diffItem,
          options: {
            ...diffItem.options,
            hash: {
              ..._context.options.hash
            },
            data: {
              ...diffItem.options.data,
            }
          }
        }
        return mapDescriptor(
          diffHashContext,
          applyAsOld(returnValue)
        )
      }
    )
    const newItems = mapDescriptor(_context, applyAsNew(returnValue))
    return [newItems, oldItems].flat(Infinity).map(applyDiff(_context, oldItems, newItems, diffHash, callback))
  }
}

module.exports.register = handlebars => {
	handlebars.registerHelper('import', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('file', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('package', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('enum', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('value', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('message', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('nested', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('field', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('oneof', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('option', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('service', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('rpc', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
	handlebars.registerHelper('extension', function (options) {
		return mapDescriptorWithDiff({descriptor: this, options}, applyOptions({descriptor: this, options})).join('\n')
	})
}
