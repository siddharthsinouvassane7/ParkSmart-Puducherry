.class public Lin/mvit/parksmart/mobile/ChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "ChromeClient.java"

.field private act:Lin/mvit/parksmart/mobile/MainActivity;

.method public constructor <init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lin/mvit/parksmart/mobile/ChromeClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    return-void
.end method

.method public cameraUri(Lin/mvit/parksmart/mobile/MainActivity;)Landroid/net/Uri;
    .registers 6
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I
    const/16 v1, 0x1d
    if-lt v0, v1, :cond_none
    :try_start_0
    new-instance v0, Landroid/content/ContentValues;
    invoke-direct {v0}, Landroid/content/ContentValues;-><init>()V
    const-string v1, "_display_name"
    const-string v2, "ParkSmart_evidence.jpg"
    invoke-virtual {v0, v1, v2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    const-string v1, "mime_type"
    const-string v2, "image/jpeg"
    invoke-virtual {v0, v1, v2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    invoke-virtual {p1}, Lin/mvit/parksmart/mobile/MainActivity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v1
    sget-object v2, Landroid/provider/MediaStore$Images$Media;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;
    invoke-virtual {v1, v2, v0}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;
    move-result-object v0
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    return-object v0
    :catch_0
    move-exception v0
    :cond_none
    const/4 v0, 0x0
    return-object v0
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 11
    iget-object v0, p0, Lin/mvit/parksmart/mobile/ChromeClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    iget-object v1, v0, Lin/mvit/parksmart/mobile/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v1, :cond_nocb
    const/4 v2, 0x0
    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :cond_nocb
    iput-object p2, v0, Lin/mvit/parksmart/mobile/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    const/4 v1, 0x0
    iput-object v1, v0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    :try_start_0
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v1
    const-string v2, "Add photo"
    invoke-static {v1, v2}, Landroid/content/Intent;->createChooser(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;
    move-result-object v2
    invoke-virtual {p0, v0}, Lin/mvit/parksmart/mobile/ChromeClient;->cameraUri(Lin/mvit/parksmart/mobile/MainActivity;)Landroid/net/Uri;
    move-result-object v3
    if-eqz v3, :cond_nocam
    iput-object v3, v0, Lin/mvit/parksmart/mobile/MainActivity;->camUri:Landroid/net/Uri;
    new-instance v4, Landroid/content/Intent;
    const-string v5, "android.media.action.IMAGE_CAPTURE"
    invoke-direct {v4, v5}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v5, "output"
    invoke-virtual {v4, v5, v3}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Landroid/os/Parcelable;)Landroid/content/Intent;
    const/4 v5, 0x3
    invoke-virtual {v4, v5}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;
    const/4 v5, 0x1
    new-array v5, v5, [Landroid/os/Parcelable;
    const/4 v6, 0x0
    aput-object v4, v5, v6
    const-string v6, "android.intent.extra.INITIAL_INTENTS"
    invoke-virtual {v2, v6, v5}, Landroid/content/Intent;->putExtra(Ljava/lang/String;[Landroid/os/Parcelable;)Landroid/content/Intent;
    :cond_nocam
    const/4 v4, 0x1
    invoke-virtual {v0, v2, v4}, Lin/mvit/parksmart/mobile/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    const/4 v1, 0x1
    return v1
    :catch_0
    move-exception v1
    const/4 v1, 0x0
    iput-object v1, v0, Lin/mvit/parksmart/mobile/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    const/4 v1, 0x0
    return v1
.end method

.method public onGeolocationPermissionsShowPrompt(Ljava/lang/String;Landroid/webkit/GeolocationPermissions$Callback;)V
    .registers 8
    iget-object v0, p0, Lin/mvit/parksmart/mobile/ChromeClient;->act:Lin/mvit/parksmart/mobile/MainActivity;
    const-string v1, "android.permission.ACCESS_FINE_LOCATION"
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->checkSelfPermission(Ljava/lang/String;)I
    move-result v2
    if-eqz v2, :cond_granted
    const-string v1, "android.permission.ACCESS_COARSE_LOCATION"
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->checkSelfPermission(Ljava/lang/String;)I
    move-result v2
    if-eqz v2, :cond_granted
    iput-object p1, v0, Lin/mvit/parksmart/mobile/MainActivity;->geoOrigin:Ljava/lang/String;
    iput-object p2, v0, Lin/mvit/parksmart/mobile/MainActivity;->geoCb:Landroid/webkit/GeolocationPermissions$Callback;
    const/4 v2, 0x2
    new-array v2, v2, [Ljava/lang/String;
    const/4 v3, 0x0
    const-string v4, "android.permission.ACCESS_FINE_LOCATION"
    aput-object v4, v2, v3
    const/4 v3, 0x1
    const-string v4, "android.permission.ACCESS_COARSE_LOCATION"
    aput-object v4, v2, v3
    const/4 v3, 0x3
    invoke-virtual {v0, v2, v3}, Lin/mvit/parksmart/mobile/MainActivity;->requestPermissions([Ljava/lang/String;I)V
    return-void
    :cond_granted
    const/4 v2, 0x1
    const/4 v3, 0x0
    invoke-interface {p2, p1, v2, v3}, Landroid/webkit/GeolocationPermissions$Callback;->invoke(Ljava/lang/String;ZZ)V
    return-void
.end method
