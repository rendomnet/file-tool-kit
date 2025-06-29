import FilesUtilRN from '@rendomnet/file-tool-kit/rn';

// This is just a type check test
const testRNImport = (): void => {
  const rnUtil = new FilesUtilRN();
  console.log('React Native import works!', rnUtil);
};

testRNImport();
