# Benchmarking HA-store

1- You'll need to generate a sample with your desired distribution. Run this [generator](https://github.com/fed135/zipfian-generator).

2- Update the [settings](https://github.com/fed135/ha-store/blob/next/tests/profiling/settings.js) for the test, making sure to update the path for the sample file. Then, adjust the assertion values for your bench test.

3- Run `npm run bench`