# Benchmarking HA-store

1- You'll need to generate a sample with your desired distribution. Run this [generator](https://github.com/fed135/zipfian-generator).
The bench expectations are based on these settings: `alpha: 0.5, size: 300000`. You can find a copy [here](https://gist.github.com/fed135/56282783a4c13d87a7f89c178b5d08d7).

2- Update the [settings](https://github.com/fed135/ha-store/blob/next/tests/profiling/settings.js) for the test, making sure to update the path for the sample file. Then, adjust the assertion values for your bench test.

3- Run `npm run bench`