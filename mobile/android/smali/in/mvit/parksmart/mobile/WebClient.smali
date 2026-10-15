.class public Lin/mvit/parksmart/mobile/WebClient;
.super Landroid/webkit/WebViewClient;
.source "WebClient.java"

.field private act:Lin/mvit/parksmart/mobile/MainActivity;

.method public constructor <init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lin/mvit/parksmart/mobile/WebClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .registers 5
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {p0, v0}, Lin/mvit/parksmart/mobile/WebClient;->handle(Landroid/net/Uri;)Z
    move-result v1
    return v1
.end method

.method public handle(Landroid/net/Uri;)Z
    .registers 6
    if-nez p1, :cond_hasuri
    const/4 v2, 0x0
    return v2
    :cond_hasuri
    invoke-static {p1}, Lmvit/parksmart/AssetServer;->isLocal(Landroid/net/Uri;)Z
    move-result v2
    if-eqz v2, :cond_notlocal
    const/4 v2, 0x0
    return v2
    :cond_notlocal
    invoke-virtual {p1}, Landroid/net/Uri;->getScheme()Ljava/lang/String;
    move-result-object v0
    const-string v1, "file"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    if-eqz v2, :cond_external
    const/4 v2, 0x0
    return v2
    :cond_external
    :try_start_0
    new-instance v2, Landroid/content/Intent;
    const-string v3, "android.intent.action.VIEW"
    invoke-direct {v2, v3, p1}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V
    iget-object v3, p0, Lin/mvit/parksmart/mobile/WebClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    invoke-virtual {v3, v2}, Lin/mvit/parksmart/mobile/MainActivity;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    goto :goto_ret
    :catch_0
    move-exception v2
    :goto_ret
    const/4 v2, 0x1
    return v2
.end method

.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .registers 5
    iget-object v0, p0, Lin/mvit/parksmart/mobile/WebClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v1
    invoke-static {v0, v1}, Lmvit/parksmart/AssetServer;->serve(Landroid/content/Context;Landroid/net/Uri;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    return-object v0
.end method
