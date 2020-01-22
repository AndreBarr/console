defmodule Console.Teams.Team do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "teams" do
    field :name, :string
    field :encryption_version, :binary
    field :private_key, Cloak.EncryptedBinaryField
    field :public_key, Cloak.EncryptedBinaryField
    field :address, :binary
    field :address_b58, :string

    belongs_to :organization, Console.Teams.Organization

    has_many :devices, Console.Devices.Device, on_delete: :delete_all
    has_many :gateways, Console.Gateways.Gateway, on_delete: :delete_all
    has_many :notifications, Console.Notifications.Notification, on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(team, attrs) do
    team
    |> cast(attrs, [:name])
    |> validate_required(:name, message: "Team Name is required")
    |> validate_length(:name, min: 3, message: "Team Name must be at least 3 letters")
  end

  def create_changeset(team, attrs, organization) do
    team
    |> changeset(attrs)
    |> put_keys()
    |> put_change(:organization_id, organization.id)
    |> put_change(:encryption_version, Cloak.version)
  end

  @doc false
  def create_changeset(team, attrs) do
    team
    |> changeset(attrs)
    |> put_keys()
    |> put_change(:encryption_version, Cloak.version)
  end

  @doc false
  def user_join_changeset(team, user, attrs) do
    team
    |> changeset(attrs)
    |> put_assoc(:users, [user])
  end

  defp put_keys(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true} ->
        {public_key, private_key} = generate_keypair()
        address = public_key_to_address(public_key)
        address_b58 = public_key_to_b58(public_key)

        changeset
        |> put_change(:private_key, to_bin(private_key))
        |> put_change(:public_key, to_bin(private_key))
        |> put_change(:address, address)
        |> put_change(:address_b58, address_b58)
      _ -> changeset
    end
  end

  defp generate_keypair() do
    %{public: public_key, secret: private_key} = :libp2p_crypto.generate_keys(:ed25519)
    {public_key, private_key}
  end

  defp public_key_to_address(public_key) do
    :libp2p_crypto.pubkey_to_bin(public_key)
  end

  defp public_key_to_b58(public_key) do
    to_string(:libp2p_crypto.pubkey_to_b58(public_key))
  end

  defp to_bin(term) do
    :erlang.term_to_binary(term)
  end
end
