start: app-build app-run

.PHONY: all

install: app-build app-install

app-build:
	npm run build

app-run:
	homey app run

app-install:
	homey app install
