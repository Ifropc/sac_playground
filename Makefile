build:
	cargo build
	stellar contract build
	cd ts
	yarn
	yarn build

test:
	yarn test

clean_js:
	rm -rf dist
	rm -rf node_modules

clean_test:
	rm -rf .soroban
	rm -f .test_data.json

clean_contracts:
	rm -rf target

clean:
	clean_js
	clean_test
	clean_contracts



