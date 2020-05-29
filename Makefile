# See https://github.com/gponsinet/make-everything


protoc.hbs/template_dir := ./examples/templates

-include .mk/protoc.mk
-include .mk/yarn.mk

.PHONY: install
install: .mk install.yarn

.mk:
	git clone git@github.com:gponsinet/make-everything $@
	$(MAKE) install

$(yarn.mod)/protoc-gen-hbs: $(yarn.bin)/protoc-gen-hbs
	[ -e "$(dir $@)" ] || mkdir -p $@

$(yarn.bin)/protoc-gen-hbs: install.yarn
	[ -e "$(dir $@)" ] || mkdir -p $(dir $@)
	ln -sf ../../src/main.js $@

.PHONY: gen
gen: install gen.protoc.hbs

.PHONY: clean
clean: clean.protoc.hbs
