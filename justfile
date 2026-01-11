# Clean up files created by running stack tests
clean:
    rm -rf node_modules/
    rm -rf **/node_modules/
    rm -rf playwright-report/
    rm -rf **/playwright-report/
    rm -rf test-results/
    rm -rf **/test-results/
    rm -rf cucumber-report/
    rm -rf **/cucumber-report/
    rm -f trace.zip
    rm -rf dist/
    rm -rf build/
    rm -rf out/
    rm -rf coverage/
    rm -f *.tsbuildinfo
