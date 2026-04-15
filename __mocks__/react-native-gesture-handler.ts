const mock = require('react-native-gesture-handler/src/mocks.ts');

module.exports = {
  ...mock,
  PanGestureHandler: ({ children }: any) => children,
  State: {
    END: 'end',
    ACTIVE: 'active',
    BEGAN: 'began',
  },
};
