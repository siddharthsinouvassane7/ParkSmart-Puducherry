.class public Lin/mvit/parksmart/mobile/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

.field public web:Landroid/webkit/WebView;
.field public fileCb:Landroid/webkit/ValueCallback;
.field public camUri:Landroid/net/Uri;
.field public saveName:Ljava/lang/String;
.field public saveMime:Ljava/lang/String;
.field public saveText:Ljava/lang/String;
.field public printTitle:Ljava/lang/String;
.field public geoOrigin:Ljava/lang/String;
.field public geoCb:Landroid/webkit/GeolocationPermissions$Callback;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 6
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->web:Landroid/webkit/WebView;
    const v1, -0xf4d5a5
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    const/4 v3, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setGeolocationEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setLoadWithOverviewMode(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setUseWideViewPort(Z)V
    invoke-virtual {v1, v3}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V
    const/16 v3, 0x64
    invoke-virtual {v1, v3}, Landroid/webkit/WebSettings;->setTextZoom(I)V
    new-instance v1, Lin/mvit/parksmart/mobile/WebClient;
    invoke-direct {v1, p0}, Lin/mvit/parksmart/mobile/WebClient;-><init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v1, Lin/mvit/parksmart/mobile/ChromeClient;
    invoke-direct {v1, p0}, Lin/mvit/parksmart/mobile/ChromeClient;-><init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V
    new-instance v1, Lin/mvit/parksmart/mobile/Bridge;
    invoke-direct {v1, p0}, Lin/mvit/parksmart/mobile/Bridge;-><init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    const-string v2, "ParkNative"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V
    invoke-virtual {p0, v0}, Lin/mvit/parksmart/mobile/MainActivity;->setContentView(Landroid/view/View;)V
    const-string v1, "https://appassets.androidplatform.net/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

.method protected onPause()V
    .registers 4
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :cond_skip
    const-string v1, "window.PS_LOCAL&&PS_LOCAL.flush()"
    const/4 v2, 0x0
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :cond_skip
    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    return-void
.end method

.method public onBackPressed()V
    .registers 3
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1
    if-eqz v1, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :cond_super
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method

.method public toast(Ljava/lang/String;)V
    .registers 4
    const/4 v0, 0x1
    invoke-static {p0, p1, v0}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;
    move-result-object v0
    invoke-virtual {v0}, Landroid/widget/Toast;->show()V
    return-void
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 9
    const/4 v0, 0x1
    if-ne p1, v0, :cond_notfile
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v0, :cond_cleanup
    const/4 v1, 0x0
    const/4 v2, -0x1
    if-ne p2, v2, :cond_have
    if-eqz p3, :cond_trycam
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;
    move-result-object v2
    if-eqz v2, :cond_trycam
    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;
    move-result-object v1
    goto :cond_have
    :cond_trycam
    iget-object v2, p0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    if-eqz v2, :cond_have
    const/4 v3, 0x1
    new-array v1, v3, [Landroid/net/Uri;
    const/4 v3, 0x0
    aput-object v2, v1, v3
    const/4 v3, 0x0
    iput-object v3, p0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    :cond_have
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    const/4 v0, 0x0
    iput-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    :cond_cleanup
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    if-eqz v0, :cond_filedone
    :try_start_0
    invoke-virtual {p0}, Lin/mvit/parksmart/mobile/MainActivity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v1
    const/4 v2, 0x0
    invoke-virtual {v1, v0, v2, v2}, Landroid/content/ContentResolver;->delete(Landroid/net/Uri;Ljava/lang/String;[Ljava/lang/String;)I
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    goto :goto_afterdel
    :catch_0
    move-exception v1
    :goto_afterdel
    const/4 v0, 0x0
    iput-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    :cond_filedone
    return-void

    :cond_notfile
    const/4 v0, 0x2
    if-ne p1, v0, :cond_super
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->saveText:Ljava/lang/String;
    const/4 v1, 0x0
    iput-object v1, p0, Lin/mvit/parksmart/mobile/MainActivity;->saveText:Ljava/lang/String;
    const/4 v1, -0x1
    if-ne p2, v1, :cond_savedone
    if-eqz p3, :cond_savedone
    if-eqz v0, :cond_savedone
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;
    move-result-object v1
    if-eqz v1, :cond_savedone
    :try_start_1
    invoke-virtual {p0}, Lin/mvit/parksmart/mobile/MainActivity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v2
    invoke-virtual {v2, v1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;
    move-result-object v2
    const-string v3, "UTF-8"
    invoke-virtual {v0, v3}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
    move-result-object v3
    invoke-virtual {v2, v3}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {v2}, Ljava/io/OutputStream;->flush()V
    invoke-virtual {v2}, Ljava/io/OutputStream;->close()V
    const-string v3, "File saved"
    invoke-virtual {p0, v3}, Lin/mvit/parksmart/mobile/MainActivity;->toast(Ljava/lang/String;)V
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1
    goto :cond_savedone
    :catch_1
    move-exception v2
    const-string v3, "Could not save the file"
    invoke-virtual {p0, v3}, Lin/mvit/parksmart/mobile/MainActivity;->toast(Ljava/lang/String;)V
    :cond_savedone
    return-void

    :cond_super
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    return-void
.end method

.method public onRequestPermissionsResult(I[Ljava/lang/String;[I)V
    .registers 9
    const/4 v0, 0x3
    if-ne p1, v0, :cond_done
    iget-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->geoCb:Landroid/webkit/GeolocationPermissions$Callback;
    if-eqz v0, :cond_done
    const/4 v1, 0x0
    if-eqz p3, :cond_invoke
    array-length v2, p3
    const/4 v3, 0x0
    :goto_loop
    if-ge v3, v2, :cond_invoke
    aget v4, p3, v3
    if-nez v4, :cond_next
    const/4 v1, 0x1
    :cond_next
    add-int/lit8 v3, v3, 0x1
    goto :goto_loop
    :cond_invoke
    iget-object v2, p0, Lin/mvit/parksmart/mobile/MainActivity;->geoOrigin:Ljava/lang/String;
    const/4 v3, 0x0
    invoke-interface {v0, v2, v1, v3}, Landroid/webkit/GeolocationPermissions$Callback;->invoke(Ljava/lang/String;ZZ)V
    const/4 v0, 0x0
    iput-object v0, p0, Lin/mvit/parksmart/mobile/MainActivity;->geoCb:Landroid/webkit/GeolocationPermissions$Callback;
    :cond_done
    return-void
.end method
