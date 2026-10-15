.class public final Lmvit/parksmart/AssetServer;
.super Ljava/lang/Object;
.source "AssetServer.java"


# static fields
.field public static final HOST:Ljava/lang/String; = "appassets.androidplatform.net"

.field public static final START:Ljava/lang/String; = "https://appassets.androidplatform.net/index.html"


# direct methods
.method private constructor <init>()V
    .registers 1

    .prologue
    .line 20
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static isLocal(Landroid/net/Uri;)Z
    .registers 3

    .prologue
    .line 23
    if-eqz p0, :cond_1c

    const-string v0, "https"

    invoke-virtual {p0}, Landroid/net/Uri;->getScheme()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_1c

    const-string v0, "appassets.androidplatform.net"

    invoke-virtual {p0}, Landroid/net/Uri;->getHost()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_1c

    const/4 v0, 0x1

    :goto_1b
    return v0

    :cond_1c
    const/4 v0, 0x0

    goto :goto_1b
.end method

.method static mime(Ljava/lang/String;)Ljava/lang/String;
    .registers 3

    .prologue
    .line 49
    invoke-virtual {p0}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v0

    .line 50
    const-string v1, ".html"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_f

    const-string v0, "text/html"

    .line 59
    :goto_e
    return-object v0

    .line 51
    :cond_f
    const-string v1, ".js"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_1a

    const-string v0, "application/javascript"

    goto :goto_e

    .line 52
    :cond_1a
    const-string v1, ".css"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_25

    const-string v0, "text/css"

    goto :goto_e

    .line 53
    :cond_25
    const-string v1, ".json"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_30

    const-string v0, "application/json"

    goto :goto_e

    .line 54
    :cond_30
    const-string v1, ".png"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_3b

    const-string v0, "image/png"

    goto :goto_e

    .line 55
    :cond_3b
    const-string v1, ".jpg"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-nez v1, :cond_4b

    const-string v1, ".jpeg"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_4e

    :cond_4b
    const-string v0, "image/jpeg"

    goto :goto_e

    .line 56
    :cond_4e
    const-string v1, ".svg"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_59

    const-string v0, "image/svg+xml"

    goto :goto_e

    .line 57
    :cond_59
    const-string v1, ".wasm"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_64

    const-string v0, "application/wasm"

    goto :goto_e

    .line 58
    :cond_64
    const-string v1, ".woff2"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_6f

    const-string v0, "font/woff2"

    goto :goto_e

    .line 59
    :cond_6f
    const-string v0, "application/octet-stream"

    goto :goto_e
.end method

.method private static notFound(Ljava/util/Map;)Landroid/webkit/WebResourceResponse;
    .registers 8
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/util/Map",
            "<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;)",
            "Landroid/webkit/WebResourceResponse;"
        }
    .end annotation

    .prologue
    .line 45
    new-instance v0, Landroid/webkit/WebResourceResponse;

    const-string v1, "text/plain"

    const-string v2, "utf-8"

    const/16 v3, 0x194

    const-string v4, "Not Found"

    new-instance v6, Ljava/io/ByteArrayInputStream;

    const/4 v5, 0x0

    new-array v5, v5, [B

    invoke-direct {v6, v5}, Ljava/io/ByteArrayInputStream;-><init>([B)V

    move-object v5, p0

    invoke-direct/range {v0 .. v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V

    return-object v0
.end method

.method public static serve(Landroid/content/Context;Landroid/net/Uri;)Landroid/webkit/WebResourceResponse;
    .registers 9

    .prologue
    const/4 v2, 0x0

    .line 27
    invoke-static {p1}, Lmvit/parksmart/AssetServer;->isLocal(Landroid/net/Uri;)Z

    move-result v0

    if-nez v0, :cond_9

    move-object v0, v2

    .line 40
    :goto_8
    return-object v0

    .line 28
    :cond_9
    invoke-virtual {p1}, Landroid/net/Uri;->getPath()Ljava/lang/String;

    move-result-object v0

    .line 29
    if-eqz v0, :cond_1d

    invoke-virtual {v0}, Ljava/lang/String;->length()I

    move-result v1

    if-eqz v1, :cond_1d

    const-string v1, "/"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_1f

    :cond_1d
    const-string v0, "/index.html"

    .line 30
    :cond_1f
    new-instance v5, Ljava/util/HashMap;

    invoke-direct {v5}, Ljava/util/HashMap;-><init>()V

    .line 31
    const-string v1, "Access-Control-Allow-Origin"

    const-string v3, "*"

    invoke-interface {v5, v1, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 32
    const-string v1, "Cache-Control"

    const-string v3, "no-cache"

    invoke-interface {v5, v1, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 33
    const-string v1, ".."

    invoke-virtual {v0, v1}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v1

    if-eqz v1, :cond_3f

    invoke-static {v5}, Lmvit/parksmart/AssetServer;->notFound(Ljava/util/Map;)Landroid/webkit/WebResourceResponse;

    move-result-object v0

    goto :goto_8

    .line 35
    :cond_3f
    :try_start_3f
    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;

    move-result-object v1

    new-instance v3, Ljava/lang/StringBuilder;

    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V

    const-string v4, "www"

    invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v3

    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v3

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v1, v3}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object v6

    .line 36
    invoke-static {v0}, Lmvit/parksmart/AssetServer;->mime(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    .line 37
    const-string v0, "text/"

    invoke-virtual {v1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_7e

    const-string v0, "javascript"

    invoke-virtual {v1, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_7e

    const-string v0, "json"

    invoke-virtual {v1, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_7e

    const-string v0, "svg+xml"

    invoke-virtual {v1, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_96

    :cond_7e
    const/4 v0, 0x1

    move v3, v0

    .line 38
    :goto_80
    new-instance v0, Landroid/webkit/WebResourceResponse;

    if-eqz v3, :cond_86

    const-string v2, "utf-8"

    :cond_86
    const/16 v3, 0xc8

    const-string v4, "OK"

    invoke-direct/range {v0 .. v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V
    :try_end_8d
    .catch Ljava/lang/Exception; {:try_start_3f .. :try_end_8d} :catch_8f

    goto/16 :goto_8

    .line 39
    :catch_8f
    move-exception v0

    .line 40
    invoke-static {v5}, Lmvit/parksmart/AssetServer;->notFound(Ljava/util/Map;)Landroid/webkit/WebResourceResponse;

    move-result-object v0

    goto/16 :goto_8

    .line 37
    :cond_96
    const/4 v0, 0x0

    move v3, v0

    goto :goto_80
.end method
