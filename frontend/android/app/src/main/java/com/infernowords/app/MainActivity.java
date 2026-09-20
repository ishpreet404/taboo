package com.infernowords.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        // Android scales WebView text by the system font-size setting, which blows
        // fixed game layouts apart. Render at 100% like the design expects.
        settings.setTextZoom(100);
        // No pinch / double-tap zoom, and no overview mode rescaling the page to fit
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true); // honour the page's <meta viewport>
        // No rubber-band glow/stretch when the page hits its edges
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
