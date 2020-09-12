# See https://github.com/gponsinet/make-everything

-include .mk/env.mk
-include .mk/protoc.mk
-include .mk/yarn.mk

.PHONY: install
install: .mk/.git install.yarn

$(yarn.mod)/protoc-gen-hbs: $(yarn.bin)/protoc-gen-hbs
	[ -e "$(dir $@)" ] || mkdir -p $@

$(yarn.bin)/protoc-gen-hbs: install.yarn
	[ -e "$(dir $@)" ] || mkdir -p $(dir $@)
	ln -sf ../../src/main.js $@

.PHONY: gen
gen: install gen.protoc.hbs

.PHONY: clean
clean: clean.protoc.hbs
