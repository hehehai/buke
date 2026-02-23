#import <Cocoa/Cocoa.h>
#import <Foundation/Foundation.h>

static NSString *const kDragRegionIdentifier = @"buke-drag-region";

@interface BukeDragRegionView : NSView
@end

@implementation BukeDragRegionView
- (BOOL)mouseDownCanMoveWindow {
  return YES;
}
@end

static bool RunOnMainThreadSync(bool (^work)(void)) {
  if ([NSThread isMainThread]) {
    return work();
  }

  __block bool result = false;
  dispatch_sync(dispatch_get_main_queue(), ^{
    @autoreleasepool {
      result = work();
    }
  });
  return result;
}

extern "C" {
  bool enableWindowVibrancy(void *windowPtr, bool hideTitleBar) {
    return RunOnMainThreadSync(^bool {
      if (!windowPtr) {
        return false;
      }

      NSWindow *window = (__bridge NSWindow *)windowPtr;
      window.titleVisibility = hideTitleBar ? NSWindowTitleHidden : NSWindowTitleVisible;
      window.titlebarAppearsTransparent = hideTitleBar ? YES : NO;
      window.backgroundColor = [NSColor clearColor];

      NSVisualEffectView *visualEffectView =
        [[NSVisualEffectView alloc] initWithFrame:window.contentView.bounds];
      visualEffectView.material = NSVisualEffectMaterialHUDWindow;
      visualEffectView.blendingMode = NSVisualEffectBlendingModeBehindWindow;
      visualEffectView.state = NSVisualEffectStateActive;
      visualEffectView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;

      [window.contentView addSubview:visualEffectView positioned:NSWindowBelow relativeTo:nil];

      return true;
    });
  }

  bool ensureWindowShadow(void *windowPtr) {
    return RunOnMainThreadSync(^bool {
      if (!windowPtr) {
        return false;
      }

      NSWindow *window = (__bridge NSWindow *)windowPtr;
      window.hasShadow = YES;
      return true;
    });
  }

  bool setWindowTrafficLightsPosition(void *windowPtr, double x, double y) {
    return RunOnMainThreadSync(^bool {
      if (!windowPtr) {
        return false;
      }

      NSWindow *window = (__bridge NSWindow *)windowPtr;
      NSButton *closeButton = [window standardWindowButton:NSWindowCloseButton];
      NSButton *miniaturizeButton =
        [window standardWindowButton:NSWindowMiniaturizeButton];
      NSButton *zoomButton = [window standardWindowButton:NSWindowZoomButton];

      if (!closeButton || !miniaturizeButton || !zoomButton) {
        return false;
      }

      NSRect closeFrame = closeButton.frame;
      NSRect miniFrame = miniaturizeButton.frame;
      NSRect zoomFrame = zoomButton.frame;

      closeFrame.origin.x = x;
      closeFrame.origin.y = y;

      miniFrame.origin.x = x + closeFrame.size.width + 8.0;
      miniFrame.origin.y = y;

      zoomFrame.origin.x = miniFrame.origin.x + miniFrame.size.width + 8.0;
      zoomFrame.origin.y = y;

      closeButton.frame = closeFrame;
      miniaturizeButton.frame = miniFrame;
      zoomButton.frame = zoomFrame;

      return true;
    });
  }

  bool setNativeWindowDragRegion(void *windowPtr, double x, double height) {
    return RunOnMainThreadSync(^bool {
      if (!windowPtr) {
        return false;
      }

      NSWindow *window = (__bridge NSWindow *)windowPtr;
      NSView *contentView = window.contentView;
      if (!contentView) {
        return false;
      }

      NSView *dragRegion = nil;
      for (NSView *subview in contentView.subviews) {
        if ([subview.identifier isEqualToString:kDragRegionIdentifier]) {
          dragRegion = subview;
          break;
        }
      }

      if (!dragRegion) {
        dragRegion = [[BukeDragRegionView alloc] initWithFrame:NSMakeRect(0, 0, 0, 0)];
        dragRegion.wantsLayer = YES;
        dragRegion.layer.backgroundColor = [NSColor clearColor].CGColor;
        dragRegion.autoresizingMask = NSViewWidthSizable | NSViewMinYMargin;
        dragRegion.identifier = kDragRegionIdentifier;
        [contentView addSubview:dragRegion positioned:NSWindowAbove relativeTo:nil];
      }

      dragRegion.frame = NSMakeRect(
        x,
        contentView.bounds.size.height - height,
        contentView.bounds.size.width - x,
        height
      );
      window.movableByWindowBackground = YES;

      return true;
    });
  }
}
