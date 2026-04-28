// Standalone mock — does NOT import @gorhom/bottom-sheet/mock.js because that
// file contains JSX inside a CommonJS module and cannot be transformed by Jest.
const React = require('react');

const NOOP = () => {};

const BottomSheetModalProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => children;

const BottomSheetBackdrop = NOOP;

class BottomSheet extends React.Component<{ children?: React.ReactNode }> {
  snapToIndex() {}
  snapToPosition() {}
  expand() {}
  collapse() {}
  close() {}
  forceClose() {}
  render() {
    return this.props.children ?? null;
  }
}

class BottomSheetModal extends React.Component<{
  children?: React.ReactNode | ((data: unknown) => React.ReactNode);
}> {
  data: unknown = null;
  snapToIndex() {}
  snapToPosition() {}
  expand() {}
  collapse() {}
  close() {
    this.data = null;
  }
  forceClose() {
    this.data = null;
  }
  present(data?: unknown) {
    this.data = data ?? null;
  }
  dismiss() {
    this.data = null;
  }
  render() {
    const { children: Content } = this.props;
    if (typeof Content === 'function') {
      return React.createElement(Content as React.FC, { data: this.data });
    }
    return Content ?? null;
  }
}

const useBottomSheet = () => ({
  snapToIndex: NOOP,
  snapToPosition: NOOP,
  expand: NOOP,
  collapse: NOOP,
  close: NOOP,
  forceClose: NOOP,
  animatedIndex: { value: 0 },
  animatedPosition: { value: 0 },
});

const useBottomSheetModal = () => ({
  present: NOOP,
  dismiss: NOOP,
  dismissAll: NOOP,
});

const useBottomSheetDynamicSnapPoints = (
  initialSnapPoints: unknown[] = []
) => ({
  animatedSnapPoints: { value: initialSnapPoints },
  animatedHandleHeight: { value: 0 },
  animatedContentHeight: { value: 0 },
  handleContentLayout: NOOP,
});

const BottomSheetFlatList = ({ children }: { children?: React.ReactNode }) =>
  children ?? null;
const BottomSheetScrollView = ({ children }: { children?: React.ReactNode }) =>
  children ?? null;
const BottomSheetView = ({ children }: { children?: React.ReactNode }) =>
  children ?? null;
const BottomSheetTextInput = NOOP;
const BottomSheetFooter = NOOP;
const BottomSheetHandle = NOOP;

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheet,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetFooter,
  BottomSheetHandle,
  useBottomSheet,
  useBottomSheetModal,
  useBottomSheetDynamicSnapPoints,
};
