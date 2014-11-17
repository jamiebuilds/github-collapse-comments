6TO5_COMMAND = node_modules/.bin/6to5
JSHINT_COMMAND = node_modules/.bin/jshint
UGLIFY_COMMAND = node_modules/.bin/uglifyjs
WATCH_COMMAND = node_modules/.bin/watch

.PHONY: clean build watch publish

clean:
	rm -rf dist

test:
	node $(JSHINT_COMMAND) src/content.js

build:
	make clean

	mkdir dist
	node $(6TO5_COMMAND) src/content.js -s -o dist/content.js
	node bin/build-manifest
	cp src/{icon.png,screenshot.png} dist

watch:
	node $(WATCH_COMMAND) "time make build" src/ --wait=0

publish:
	git pull --rebase

	make clean
	make test

	read -p "Version: "  version; \
	npm version $$version --message "v%s"

	make build

	rm dist/content.js.map
	node $(UGLIFY_COMMAND) dist/content.js -o dist/content.js
	zip -r github-collapse-comments.zip dist

	git push --follow-tags
