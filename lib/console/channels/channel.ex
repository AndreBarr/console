defmodule Console.Channels.Channel do
  use Ecto.Schema
  import Ecto.Changeset

  alias Console.Teams.Team
  alias Console.Teams.Organization
  alias Console.Events.Event
  alias Console.Channels
  alias Console.Devices.Device
  alias Console.Devices.DevicesChannels

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "channels" do
    field :active, :boolean, default: true
    field :default, :boolean, default: false
    field :credentials, Cloak.EncryptedMapField
    field :encryption_version, :binary
    field :name, :string
    field :type, :string
    field :type_name, :string

    belongs_to :organization, Organization
    many_to_many :devices, Device, join_through: DevicesChannels, on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(channel, attrs \\ %{}) do
    channel
    |> cast(attrs, [:name, :type, :active, :credentials, :organization_id, :default])
    |> validate_required([:name, :type, :active, :credentials, :organization_id, :default])
    |> put_change(:encryption_version, Cloak.version)
    |> filter_credentials()
    |> check_credentials()
    |> put_type_name()
  end

  def create_changeset(channel, attrs \\ %{}) do
    channel
    |> changeset(attrs)
  end

  def update_changeset(channel, attrs \\ %{}) do
    channel
    |> cast(attrs, [:name, :type, :active, :credentials, :organization_id, :default])
    |> validate_required([:name, :type, :active, :credentials, :organization_id, :default])
    |> check_credentials_update(channel.type)
  end

  defp put_type_name(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{type: type}} ->
        type_name =
          case type do
            "aws" -> "AWS IoT"
            "azure" -> "Azure IoT Hub"
            "google" -> "Google Cloud IoT Core"
            "mqtt" -> "MQTT"
            "http" -> "HTTP"
          end

        put_change(changeset, :type_name, type_name)
      _ -> changeset
    end
  end

  defp filter_credentials(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{type: "http", credentials: creds}} ->
        put_change(changeset, :credentials, Map.merge(creds, %{"inbound_token" => generate_token(16)}))
      _ -> changeset
    end
  end

  defp check_credentials(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{type: "http", credentials: creds}} ->
        uri = URI.parse(creds["endpoint"])
        case uri do
          %URI{scheme: nil} -> add_error(changeset, :message, "URL scheme is invalid (ex: http/https)")
          %URI{host: nil} -> add_error(changeset, :message, "URL host is invalid (ex: helium.com)")
          uri -> changeset
        end
      _ -> changeset
    end
  end

  defp check_credentials_update(changeset, type) do
    if type == "http" do
      case changeset do
        %Ecto.Changeset{valid?: true, changes: %{credentials: creds}} ->
          uri = URI.parse(creds["endpoint"])
          IO.inspect uri
          case uri do
            %URI{scheme: nil} -> add_error(changeset, :message, "URL scheme is invalid (ex: http/https)")
            %URI{host: nil} -> add_error(changeset, :message, "URL host is invalid (ex: helium.com)")
            uri -> put_change(changeset, :credentials, Map.merge(creds, %{"inbound_token" => generate_token(16)}))
          end
        _ -> changeset
      end
    else
      changeset
    end
  end

  defp generate_token(length) do
    :crypto.strong_rand_bytes(length)
    |> Base.url_encode64
    |> binary_part(0, length)
  end
end
