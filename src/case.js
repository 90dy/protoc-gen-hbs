const {
	upper,
	lower,
	capital,
	snake,
	pascal,
	camel,
	kebab,
	header,
	constant,
	title,
	sentence,
	flip,
	random,
} = require('case')

module.exports.register = handlebars => {
	handlebars.registerHelper('upper', function (str) {
		return upper(str)
	})
	handlebars.registerHelper('lower', function (str) {
		return lower(str)
	})
	handlebars.registerHelper('capital', function (str) {
		return capital(str)
	})
	handlebars.registerHelper('snake', function (str) {
		return snake(str)
	})
	handlebars.registerHelper('pascal', function (str) {
		return pascal(str)
	})
	handlebars.registerHelper('camel', function (str) {
		return camel(str)
	})
	handlebars.registerHelper('kebab', function (str) {
		return kebab(str)
	})
	handlebars.registerHelper('header', function (str) {
		return header(str)
	})
	handlebars.registerHelper('constant', function (str) {
		return constant(str)
	})
	handlebars.registerHelper('title', function (str) {
		return title(str)
	})
	handlebars.registerHelper('sentence', function (str) {
		return sentence(str)
	})
}
